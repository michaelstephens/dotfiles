/* jshint esnext:true */
/*
 *
 *  Weather extension for GNOME Shell
 *  - Displays a small weather information on the top panel.
 *  - On click, gives a popup with details about the weather.
 *
 * Copyright (C) 2011 - 2015
 *     ecyrbe <ecyrbe+spam@gmail.com>,
 *     Timur Kristof <venemo@msn.com>,
 *     Elad Alfassa <elad@fedoraproject.org>,
 *     Simon Legner <Simon.Legner@gmail.com>,
 *     Christian METZLER <neroth@xeked.com>,
 *     Mark Benjamin weather.gnome.Markie1@dfgh.net,
 *     Mattia Meneguzzo odysseus@fedoraproject.org,
 *     Meng Zhuo <mengzhuo1203+spam@gmail.com>,
 *     Jens Lody <jens@jenslody.de>
 *
 *
 * This file is part of gnome-shell-extension-openweather.
 *
 * gnome-shell-extension-openweather is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * gnome-shell-extension-openweather is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with gnome-shell-extension-openweather.  If not, see <http://www.gnu.org/licenses/>.
 *
 */

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Config = imports.misc.config;
const Convenience = Me.imports.convenience;
const ForecastIo = Me.imports.forecast_io;
const OpenweathermapOrg = Me.imports.openweathermap_org;
const Clutter = imports.gi.Clutter;
const Gettext = imports.gettext.domain('gnome-shell-extension-openweather');
const Gio = imports.gi.Gio;
const Gtk = imports.gi.Gtk;
const GLib = imports.gi.GLib;
const Lang = imports.lang;
const Mainloop = imports.mainloop;
const Soup = imports.gi.Soup;
const St = imports.gi.St;
const Util = imports.misc.util;
const _ = Gettext.gettext;

const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;

// Settings
const OPENWEATHER_SETTINGS_SCHEMA = 'org.gnome.shell.extensions.openweather';
const OPENWEATHER_DESKTOP_INTERFACE = 'org.gnome.desktop.interface';
const OPENWEATHER_PROVIDER_KEY = 'weather-provider';
const OPENWEATHER_UNIT_KEY = 'unit';
const OPENWEATHER_WIND_SPEED_UNIT_KEY = 'wind-speed-unit';
const OPENWEATHER_WIND_DIRECTION_KEY = 'wind-direction';
const OPENWEATHER_PRESSURE_UNIT_KEY = 'pressure-unit';
const OPENWEATHER_CITY_KEY = 'city';
const OPENWEATHER_ACTUAL_CITY_KEY = 'actual-city';
const OPENWEATHER_TRANSLATE_CONDITION_KEY = 'translate-condition';
const OPENWEATHER_USE_SYMBOLIC_ICONS_KEY = 'use-symbolic-icons';
const OPENWEATHER_USE_TEXT_ON_BUTTONS_KEY = 'use-text-on-buttons';
const OPENWEATHER_SHOW_TEXT_IN_PANEL_KEY = 'show-text-in-panel';
const OPENWEATHER_POSITION_IN_PANEL_KEY = 'position-in-panel';
const OPENWEATHER_SHOW_COMMENT_IN_PANEL_KEY = 'show-comment-in-panel';
const OPENWEATHER_SHOW_COMMENT_IN_FORECAST_KEY = 'show-comment-in-forecast';
const OPENWEATHER_REFRESH_INTERVAL_CURRENT = 'refresh-interval-current';
const OPENWEATHER_REFRESH_INTERVAL_FORECAST = 'refresh-interval-forecast';
const OPENWEATHER_CENTER_FORECAST_KEY = 'center-forecast';
const OPENWEATHER_DAYS_FORECAST = 'days-forecast';
const OPENWEATHER_DECIMAL_PLACES = 'decimal-places';
const OPENWEATHER_OWM_API_KEY = 'appid';
const OPENWEATHER_FC_API_KEY = 'appid-fc';

// Keep enums in sync with GSettings schemas
const WeatherProvider = {
    OPENWEATHERMAP: 0,
    FORECAST_IO: 1
};

const WeatherUnits = {
    CELSIUS: 0,
    FAHRENHEIT: 1,
    KELVIN: 2,
    RANKINE: 3,
    REAUMUR: 4,
    ROEMER: 5,
    DELISLE: 6,
    NEWTON: 7
};

const WeatherWindSpeedUnits = {
    KPH: 0,
    MPH: 1,
    MPS: 2,
    KNOTS: 3,
    FPS: 4,
    BEAUFORT: 5
};

const WeatherPressureUnits = {
    hPa: 0,
    inHg: 1,
    bar: 2,
    Pa: 3,
    kPa: 4,
    atm: 5,
    at: 6,
    Torr: 7,
    psi: 8
};

const WeatherPosition = {
    CENTER: 0,
    RIGHT: 1,
    LEFT: 2
};

const OPENWEATHER_CONV_MPS_IN_MPH = 2.23693629;
const OPENWEATHER_CONV_MPS_IN_KPH = 3.6;
const OPENWEATHER_CONV_MPS_IN_KNOTS = 1.94384449;
const OPENWEATHER_CONV_MPS_IN_FPS = 3.2808399;

let _httpSession;

const OpenweatherMenuButton = new Lang.Class({
    Name: 'OpenweatherMenuButton',

    Extends: PanelMenu.Button,

    _init: function() {
        this.owmCityId = 0;

        this.oldProvider = this._weather_provider;
        this.oldTranslateCondition = this._translate_condition;
        this.switchProvider();

        this.currentWeatherCache = undefined;
        this.forecastWeatherCache = undefined;
        // Load settings
        this.loadConfig();

        // Label
        this._weatherInfo = new St.Label({
            y_align: Clutter.ActorAlign.CENTER,
            text: _('...')
        });

        this._weatherIcon = new St.Icon({
            icon_name: 'view-refresh' + this.getIconType(),
            style_class: 'system-status-icon openweather-icon'
        });

        // Panel menu item - the current class
        let menuAlignment = 0.25;
        if (Clutter.get_default_text_direction() == Clutter.TextDirection.RTL)
            menuAlignment = 1.0 - menuAlignment;
        this.parent(menuAlignment);

        // Putting the panel item together
        let topBox = new St.BoxLayout();
        topBox.add_actor(this._weatherIcon);
        topBox.add_actor(this._weatherInfo);
        this.actor.add_actor(topBox);

        let dummyBox = new St.BoxLayout();
        this.actor.reparent(dummyBox);
        dummyBox.remove_actor(this.actor);
        dummyBox.destroy();

        let children = null;
        switch (this._position_in_panel) {
            case WeatherPosition.LEFT:
                children = Main.panel._leftBox.get_children();
                Main.panel._leftBox.insert_child_at_index(this.actor, children.length);
                break;
            case WeatherPosition.CENTER:
                children = Main.panel._centerBox.get_children();
                Main.panel._centerBox.insert_child_at_index(this.actor, children.length);
                break;
            case WeatherPosition.RIGHT:
                children = Main.panel._rightBox.get_children();
                Main.panel._rightBox.insert_child_at_index(this.actor, 0);
                break;
        }
        if (Main.panel._menus === undefined)
            Main.panel.menuManager.addMenu(this.menu);
        else
            Main.panel._menus.addMenu(this.menu);

        this._old_position_in_panel = this._position_in_panel;

        // Current weather
        this._currentWeather = new St.Bin();
        // Future weather
        this._futureWeather = new St.Bin();

        // Putting the popup item together
        let _itemCurrent = new PopupMenu.PopupBaseMenuItem({
            reactive: false
        });
        let _itemFuture = new PopupMenu.PopupBaseMenuItem({
            reactive: false
        });

        _itemCurrent.actor.add_actor(this._currentWeather);
        _itemFuture.actor.add_actor(this._futureWeather);

        this.menu.addMenuItem(_itemCurrent);

        this._separatorItem = new PopupMenu.PopupSeparatorMenuItem();
        this.menu.addMenuItem(this._separatorItem);

        this.menu.addMenuItem(_itemFuture);

        let item = new PopupMenu.PopupSeparatorMenuItem();
        this.menu.addMenuItem(item);

        this._selectCity = new PopupMenu.PopupSubMenuMenuItem("");
        this._selectCity.actor.set_height(0);
        this._selectCity._triangle.set_height(0);

        this._buttonMenu = new PopupMenu.PopupBaseMenuItem({
            reactive: false,
            style_class: 'openweather-menu-button-container'
        });

        this.rebuildButtonMenu();

        this.menu.addMenuItem(this._buttonMenu);
        this.menu.addMenuItem(this._selectCity);
        this.rebuildSelectCityItem();
        this._selectCity.menu.connect('open-state-changed', Lang.bind(this, function() {
            this._selectCity.actor.remove_style_pseudo_class('open');
        }));

        this.rebuildCurrentWeatherUi();
        this.rebuildFutureWeatherUi();

        this._network_monitor = Gio.network_monitor_get_default();

        this._connected = false;
        this._network_monitor_connection = this._network_monitor.connect('network-changed', Lang.bind(this, this._onNetworkStateChanged));
        this._checkConnectionState();

        this.menu.connect('open-state-changed', Lang.bind(this, this.recalcLayout));
    },

    stop: function() {
        if (_httpSession !== undefined)
            _httpSession.abort();

        _httpSession = undefined;

        if (this._timeoutCurrent)
            Mainloop.source_remove(this._timeoutCurrent);

        this._timeoutCurrent = undefined;

        if (this._timeoutForecast)
            Mainloop.source_remove(this._timeoutForecast);

        this._timeoutForecast = undefined;

        if (this._network_monitor_connection) {
            this._network_monitor.disconnect(this._network_monitor_connection);
            this._network_monitor_connection = undefined;
        }

        if (this._settingsC) {
            this._settings.disconnect(this._settingsC);
            this._settingsC = undefined;
        }

        if (this._settingsInterfaceC) {
            this._settingsInterface.disconnect(this._settingsInterfaceC);
            this._settingsInterfaceC = undefined;
        }

        if (this._globalThemeChangedId) {
            let context = St.ThemeContext.get_for_stage(global.stage);
            context.disconnect(this._globalThemeChangedId);
            this._globalThemeChangedId = undefined;
        }
    },

    switchProvider: function() {
        if (this._weather_provider == WeatherProvider.FORECAST_IO)
            this.useForecastIo();
        else
            this.useOpenweathermapOrg();
    },

    useOpenweathermapOrg: function() {
        this.parseWeatherForecast = OpenweathermapOrg.parseWeatherForecast;
        this.parseWeatherCurrent = OpenweathermapOrg.parseWeatherCurrent;
        this.getWeatherIcon = OpenweathermapOrg.getWeatherIcon;
        this.refreshWeatherCurrent = OpenweathermapOrg.refreshWeatherCurrent;
        this.refreshWeatherForecast = OpenweathermapOrg.refreshWeatherForecast;

        this.weatherProvider = "https://openweathermap.org/";
    },

    useForecastIo: function() {
        this.parseWeatherCurrent = ForecastIo.parseWeatherCurrent;
        this.parseWeatherForecast = ForecastIo.parseWeatherForecast;
        this.getWeatherIcon = ForecastIo.getWeatherIcon;
        this.refreshWeatherCurrent = ForecastIo.refreshWeatherCurrent;
        this.refreshWeatherForecast = function() {};

        this.weatherProvider = "https://forecast.io/";

        this.fc_locale = 'en';

        if (this._translate_condition) {
            let fc_locales = ['bs', 'de', 'en', 'es', 'fr', 'it', 'nl', 'pl', 'pt', 'ru', 'tet', 'x-pig-latin'];
            let locale = GLib.get_language_names()[0];

            if (locale.indexOf('_') != -1)
                locale = locale.split("_")[0];

            if (fc_locales.indexOf(locale) != -1)
                this.fc_locale = locale;
        }
    },

    getWeatherProviderURL: function() {
        let url = "";
        if (this._weather_provider == WeatherProvider.FORECAST_IO) {
            url = "https://forecast.io/#/f/";
            url += this.extractCoord(this._city);
        } else {
            url = "https://openweathermap.org";
            url += "/city/" + this.owmCityId;
            if (this._appid)
                url += "?APPID=" + this._appid;
        }
        return url;
    },

    loadConfig: function() {
        this._settings = Convenience.getSettings(OPENWEATHER_SETTINGS_SCHEMA);

        if (this._cities.length === 0)
            this._cities = "-8.5211767,179.1976747>Vaiaku, Tuvalu";

        this._settingsC = this._settings.connect("changed", Lang.bind(this, function() {
            if (this._cities.length === 0)
                this._cities = "-8.5211767,179.1976747>Vaiaku, Tuvalu";
            this.rebuildCurrentWeatherUi();
            this.rebuildFutureWeatherUi();
            if (this.providerChanged()) {
                this.switchProvider();
                this.currentWeatherCache = undefined;
                this.forecastWeatherCache = undefined;
            }
            if (this.locationChanged()) {
                this.currentWeatherCache = undefined;
                this.forecastWeatherCache = undefined;
            }
            this.rebuildButtonMenu();
            this.parseWeatherCurrent();
        }));
    },

    loadConfigInterface: function() {
        this._settingsInterface = Convenience.getSettings(OPENWEATHER_DESKTOP_INTERFACE);
        this._settingsInterfaceC = this._settingsInterface.connect("changed", Lang.bind(this, function() {
            this.rebuildCurrentWeatherUi();
            this.rebuildFutureWeatherUi();
            if (this.providerChanged()) {
                this.switchProvider();
                this.currentWeatherCache = undefined;
                this.forecastWeatherCache = undefined;
            }
            if (this.locationChanged()) {
                this.currentWeatherCache = undefined;
                this.forecastWeatherCache = undefined;
            }
            this.parseWeatherCurrent();
        }));
    },

    _onNetworkStateChanged: function() {
        this._checkConnectionState();
    },

    _checkConnectionState: function() {
        this._connected = this._network_monitor.network_available;
        if (this._connected)
            this.parseWeatherCurrent();
    },

    locationChanged: function() {
        let location = this.extractCoord(this._city);
        if (this.oldLocation != location) {
            return true;
        }
        return false;
    },

    providerChanged: function() {
        let provider = this._weather_provider;
        if (this.oldProvider != provider) {
            this.oldProvider = provider;
            return true;
        }
        if (provider == WeatherProvider.FORECAST_IO) {
            let translateCondition = this._translate_condition;
            if (this.oldTranslateCondition != translateCondition) {
                this.oldTranslateCondition = translateCondition;
                return true;
            }
        }
        return false;
    },

    get _clockFormat() {
        if (!this._settingsInterface)
            this.loadConfigInterface();
        return this._settingsInterface.get_string("clock-format");
    },

    get _weather_provider() {
        if (!this._settings)
            this.loadConfig();
        return this._settings.get_enum(OPENWEATHER_PROVIDER_KEY);
    },

    set _weather_provider(v) {
        if (!this._settings)
            this.loadConfig();
        this._settings.set_enum(OPENWEATHER_PROVIDER_KEY, v);
    },

    get _units() {
        if (!this._settings)
            this.loadConfig();
        return this._settings.get_enum(OPENWEATHER_UNIT_KEY);
    },

    set _units(v) {
        if (!this._settings)
            this.loadConfig();
        this._settings.set_enum(OPENWEATHER_UNIT_KEY, v);
    },

    get _wind_speed_units() {
        if (!this._settings)
            this.loadConfig();
        return this._settings.get_enum(OPENWEATHER_WIND_SPEED_UNIT_KEY);
    },

    set _wind_speed_units(v) {
        if (!this._settings)
            this.loadConfig();
        this._settings.set_enum(OPENWEATHER_WIND_SPEED_UNIT_KEY, v);
    },

    get _wind_direction() {
        if (!this._settings)
            this.loadConfig();
        return this._settings.get_boolean(OPENWEATHER_WIND_DIRECTION_KEY);
    },

    set _wind_direction(v) {
        if (!this._settings)
            this.loadConfig();
        return this._settings.set_boolean(OPENWEATHER_WIND_DIRECTION_KEY, v);
    },

    get _pressure_units() {
        if (!this._settings)
            this.loadConfig();
        return this._settings.get_enum(OPENWEATHER_PRESSURE_UNIT_KEY);
    },

    set _pressure_units(v) {
        if (!this._settings)
            this.loadConfig();
        this._settings.set_enum(OPENWEATHER_PRESSURE_UNIT_KEY, v);
    },

    get _cities() {
        if (!this._settings)
            this.loadConfig();
        return this._settings.get_string(OPENWEATHER_CITY_KEY);
    },

    set _cities(v) {
        if (!this._settings)
            this.loadConfig();
        this._settings.set_string(OPENWEATHER_CITY_KEY, v);
    },

    get _actual_city() {
        if (!this._settings)
            this.loadConfig();
        var a = this._settings.get_int(OPENWEATHER_ACTUAL_CITY_KEY);
        var b = a;
        var cities = this._cities.split(" && ");

        if (typeof cities != "object")
            cities = [cities];

        var l = cities.length - 1;

        if (a < 0)
            a = 0;

        if (l < 0)
            l = 0;

        if (a > l)
            a = l;

        return a;
    },

    set _actual_city(a) {
        if (!this._settings)
            this.loadConfig();
        var cities = this._cities.split(" && ");

        if (typeof cities != "object")
            cities = [cities];

        var l = cities.length - 1;

        if (a < 0)
            a = 0;

        if (l < 0)
            l = 0;

        if (a > l)
            a = l;

        this._settings.set_int(OPENWEATHER_ACTUAL_CITY_KEY, a);
    },

    get _city() {
        let cities = this._cities;
        let cities = cities.split(" && ");
        if (cities && typeof cities == "string")
            cities = [cities];
        if (!cities[0])
            return "";
        cities = cities[this._actual_city];
        return cities;
    },

    set _city(v) {
        let cities = this._cities;
        cities = cities.split(" && ");
        if (cities && typeof cities == "string")
            cities = [cities];
        if (!cities[0])
            cities = [];
        cities.splice(this.actual_city, 1, v);
        cities = cities.join(" && ");
        if (typeof cities != "string")
            cities = cities[0];
        this._cities = cities;
    },

    get _translate_condition() {
        if (!this._settings)
            this.loadConfig();
        return this._settings.get_boolean(OPENWEATHER_TRANSLATE_CONDITION_KEY);
    },

    set _translate_condition(v) {
        if (!this._settings)
            this.loadConfig();
        this._settings.set_boolean(OPENWEATHER_TRANSLATE_CONDITION_KEY, v);
    },

    get _getIconType() {
        if (!this._settings)
            this.loadConfig();
        return this._settings.get_boolean(OPENWEATHER_USE_SYMBOLIC_ICONS_KEY) ? 1 : 0;
    },

    set _getIconType(v) {
        if (!this._settings)
            this.loadConfig();
        this._settings.set_boolean(OPENWEATHER_USE_SYMBOLIC_ICONS_KEY, v);
    },

    get _use_text_on_buttons() {
        if (!this._settings)
            this.loadConfig();
        return this._settings.get_boolean(OPENWEATHER_USE_TEXT_ON_BUTTONS_KEY) ? 1 : 0;
    },

    set _use_text_on_buttons(v) {
        if (!this._settings)
            this.loadConfig();
        this._settings.set_boolean(OPENWEATHER_USE_TEXT_ON_BUTTONS_KEY, v);
    },

    get _text_in_panel() {
        if (!this._settings)
            this.loadConfig();
        return this._settings.get_boolean(OPENWEATHER_SHOW_TEXT_IN_PANEL_KEY);
    },

    set _text_in_panel(v) {
        if (!this._settings)
            this.loadConfig();
        this._settings.set_boolean(OPENWEATHER_SHOW_TEXT_IN_PANEL_KEY, v);
    },

    get _position_in_panel() {
        if (!this._settings)
            this.loadConfig();
        return this._settings.get_enum(OPENWEATHER_POSITION_IN_PANEL_KEY);
    },

    set _position_in_panel(v) {
        if (!this._settings)
            this.loadConfig();
        this._settings.set_enum(OPENWEATHER_POSITION_IN_PANEL_KEY, v);
    },

    get _comment_in_panel() {
        if (!this._settings)
            this.loadConfig();
        return this._settings.get_boolean(OPENWEATHER_SHOW_COMMENT_IN_PANEL_KEY);
    },

    set _comment_in_panel(v) {
        if (!this._settings)
            this.loadConfig();
        this._settings.set_boolean(OPENWEATHER_SHOW_COMMENT_IN_PANEL_KEY, v);
    },

    get _comment_in_forecast() {
        if (!this._settings)
            this.loadConfig();
        return this._settings.get_boolean(OPENWEATHER_SHOW_COMMENT_IN_FORECAST_KEY);
    },

    set _comment_in_forecast(v) {
        if (!this._settings)
            this.loadConfig();
        this._settings.set_boolean(OPENWEATHER_SHOW_COMMENT_IN_FORECAST_KEY, v);
    },

    get _refresh_interval_current() {
        if (!this._settings)
            this.loadConfig();
        let v = this._settings.get_int(OPENWEATHER_REFRESH_INTERVAL_CURRENT);
        return ((v >= 600) ? v : 600);
    },

    set _refresh_interval_current(v) {
        if (!this._settings)
            this.loadConfig();
        this._settings.set_int(OPENWEATHER_REFRESH_INTERVAL_CURRENT, ((v >= 600) ? v : 600));
    },

    get _refresh_interval_forecast() {
        if (!this._settings)
            this.loadConfig();
        let v = this._settings.get_int(OPENWEATHER_REFRESH_INTERVAL_FORECAST);
        return ((v >= 600) ? v : 600);
    },

    set _refresh_interval_forecast(v) {
        if (!this._settings)
            this.loadConfig();
        this._settings.set_int(OPENWEATHER_REFRESH_INTERVAL_FORECAST, ((v >= 600) ? v : 600));
    },

    get _center_forecast() {
        if (!this._settings)
            this.loadConfig();
        return this._settings.get_boolean(OPENWEATHER_CENTER_FORECAST_KEY);
    },

    set _center_forecast(v) {
        if (!this._settings)
            this.loadConfig();
        this._settings.set_boolean(OPENWEATHER_CENTER_FORECAST_KEY, v);
    },

    get _days_forecast() {
        if (!this._settings)
            this.loadConfig();
        return this._settings.get_int(OPENWEATHER_DAYS_FORECAST);
    },

    set _days_forecast(v) {
        if (!this._settings)
            this.loadConfig();
        this._settings.set_int(OPENWEATHER_DAYS_FORECAST, v);
    },

    get _decimal_places() {
        if (!this._settings)
            this.loadConfig();
        return this._settings.get_int(OPENWEATHER_DECIMAL_PLACES);
    },

    set _decimal_places(v) {
        if (!this._settings)
            this.loadConfig();
        this._settings.set_int(OPENWEATHER_DECIMAL_PLACES, v);
    },

    get _appid() {
        if (!this._settings)
            this.loadConfig();
        let key = this._settings.get_string(OPENWEATHER_OWM_API_KEY);
        return (key.length == 32) ? key : '';
    },

    set _appid(v) {
        if (!this._settings)
            this.loadConfig();
        this._settings.set_string(OPENWEATHER_OWM_API_KEY, v);
    },

    get _appid_fc() {
        if (!this._settings)
            this.loadConfig();
        let key = this._settings.get_string(OPENWEATHER_FC_API_KEY);
        return (key.length == 32) ? key : '';
    },

    set _appid_fc(v) {
        if (!this._settings)
            this.loadConfig();
        this._settings.set_string(OPENWEATHER_FC_API_KEY, v);
    },

    rebuildButtonMenu: function() {
        if (this._buttonBox) {
            if (this._buttonBox1) {
                this._buttonBox1.destroy();
                this._buttonBox1 = undefined;

            }
            if (this._buttonBox2) {
                this._buttonBox2.destroy();
                this._buttonBox2 = undefined;
            }
            this._buttonMenu.removeActor(this._buttonBox);
            this._buttonBox.destroy();
            this._buttonBox = undefined;
        }

        if (this._buttonBox1) {
            this._buttonBox1.destroy();
            this._buttonBox1 = undefined;
        }
        if (this._buttonBox2) {
            this._buttonBox2.destroy();
            this._buttonBox2 = undefined;
        }

        this._locationButton = Main.panel.statusArea.aggregateMenu._system._createActionButton('find-location-symbolic', _("Locations"));
        if (this._use_text_on_buttons)
            this._locationButton.set_label(this._locationButton.get_accessible_name());

        this._locationButton.connect('clicked', Lang.bind(this, function() {
            this._selectCity._setOpenState(!this._selectCity._getOpenState());
        }));
        this._buttonBox1 = new St.BoxLayout({
            style_class: 'openweather-button-box'
        });
        this._buttonBox1.add_actor(this._locationButton);

        this._reloadButton = Main.panel.statusArea.aggregateMenu._system._createActionButton('view-refresh-symbolic', _("Reload Weather Information"));
        if (this._use_text_on_buttons)
            this._reloadButton.set_label(this._reloadButton.get_accessible_name());
        this._reloadButton.connect('clicked', Lang.bind(this, function() {
            this.currentWeatherCache = undefined;
            this.forecastWeatherCache = undefined;
            this.parseWeatherCurrent();
            this.recalcLayout();
        }));
        this._buttonBox1.add_actor(this._reloadButton);

        this._buttonBox2 = new St.BoxLayout({
            style_class: 'openweather-button-box'
        });

        this._urlButton = Main.panel.statusArea.aggregateMenu._system._createActionButton('', _("Weather data provided by:") + (this._use_text_on_buttons ? "\n" : "  ") + this.weatherProvider);
        this._urlButton.set_label(this._urlButton.get_accessible_name());
        this._urlButton.style_class += ' openweather-provider';

        this._urlButton.connect('clicked', Lang.bind(this, function() {
            this.menu.actor.hide();
            let url = this.getWeatherProviderURL();

            try {
                Gtk.show_uri(null, url, global.get_current_time());
            } catch (err) {
                let title = _("Can not open %s").format(url);
                Main.notifyError(title, err.message);
            }
        }));

        this._buttonBox2.add_actor(this._urlButton);

        this._prefsButton = Main.panel.statusArea.aggregateMenu._system._createActionButton('preferences-system-symbolic', _("Weather Settings"));
        if (this._use_text_on_buttons)
            this._prefsButton.set_label(this._prefsButton.get_accessible_name());
        this._prefsButton.connect('clicked', Lang.bind(this, this._onPreferencesActivate));
        this._buttonBox2.add_actor(this._prefsButton);

        this._buttonMenu.actor.add_actor(this._buttonBox1);
        this._buttonMenu.actor.add_actor(this._buttonBox2);

        this._buttonBox1MinWidth = undefined;
    },

    rebuildSelectCityItem: function() {
        this._selectCity.menu.removeAll();
        let item = null;

        let cities = this._cities;
        cities = cities.split(" && ");
        if (cities && typeof cities == "string")
            cities = [cities];
        if (!cities[0])
            return;

        for (let i = 0; cities.length > i; i++) {
            item = new PopupMenu.PopupMenuItem(this.extractLocation(cities[i]));
            item.location = i;
            if (i == this._actual_city) {
                item.setOrnament(PopupMenu.Ornament.DOT);
            }

            this._selectCity.menu.addMenuItem(item);
            // override the items default onActivate-handler, to keep the ui open while chosing the location
            item.activate = this._onActivate;
        }

        if (cities.length == 1)
            this._selectCity.actor.hide();
        else
            this._selectCity.actor.show();

    },

    _onActivate: function() {
        openweatherMenu._actual_city = this.location;
    },

    extractLocation: function() {
        if (!arguments[0])
            return "";

        if (arguments[0].search(">") == -1)
            return _("Invalid city");
        return arguments[0].split(">")[1];
    },

    extractCity: function() {
        if (!arguments[0])
            return "";
        let city = this.extractLocation(arguments[0]);
        if (city.indexOf("(") == -1)
            return _("Invalid city");
        return city.split("(")[0].trim();
    },

    extractCoord: function() {
        if (!arguments[0])
            return 0;

        if (arguments[0].search(">") == -1)
            return 0;
        return arguments[0].split(">")[0];
    },

    _onPreferencesActivate: function() {
        this.menu.actor.hide();
        Util.spawn(["gnome-shell-extension-prefs", "openweather-extension@jenslody.de"]);
        return 0;
    },

    recalcLayout: function() {
        if (!this.menu.isOpen)
            return;
        if (this._buttonBox1MinWidth === undefined)
            this._buttonBox1MinWidth = this._buttonBox1.get_width();
        this._buttonBox1.set_width(Math.max(this._buttonBox1MinWidth, this._currentWeather.get_width() - this._buttonBox2.get_width()));
        if (this._forecastScrollBox !== undefined && this._forecastBox !== undefined && this._currentWeather !== undefined) {
            this._forecastScrollBox.set_width(Math.max(this._currentWeather.get_width(), (this._buttonBox1.get_width() + this._buttonBox2.get_width())));
            this._forecastScrollBox.show();
            if (this._forecastBox.get_preferred_width(this._forecastBox.get_height())[0] > this._currentWeather.get_width()) {
                this._forecastScrollBox.hscroll.margin_top = 10;
                this._forecastScrollBox.hscroll.show();
            } else {
                this._forecastScrollBox.hscroll.margin_top = 0;
                this._forecastScrollBox.hscroll.hide();
            }
        }
    },

    unit_to_unicode: function() {
        if (this._units == WeatherUnits.FAHRENHEIT)
            return '\u00B0F';
        else if (this._units == WeatherUnits.KELVIN)
            return 'K';
        else if (this._units == WeatherUnits.RANKINE)
            return '\u00B0Ra';
        else if (this._units == WeatherUnits.REAUMUR)
            return '\u00B0R\u00E9';
        else if (this._units == WeatherUnits.ROEMER)
            return '\u00B0R\u00F8';
        else if (this._units == WeatherUnits.DELISLE)
            return '\u00B0De';
        else if (this._units == WeatherUnits.NEWTON)
            return '\u00B0N';
        else
            return '\u00B0C';
    },

    hasIcon: function(icon) {
        return Gtk.IconTheme.get_default().has_icon(icon + this.getIconType());
    },

    toFahrenheit: function(t) {
        return ((Number(t) * 1.8) + 32).toFixed(this._decimal_places);
    },

    toKelvin: function(t) {
        return (Number(t) + 273.15).toFixed(this._decimal_places);
    },

    toRankine: function(t) {
        return ((Number(t) * 1.8) + 491.67).toFixed(this._decimal_places);
    },

    toReaumur: function(t) {
        return (Number(t) * 0.8).toFixed(this._decimal_places);
    },

    toRoemer: function(t) {
        return ((Number(t) * 21 / 40) + 7.5).toFixed(this._decimal_places);
    },

    toDelisle: function(t) {
        return ((100 - Number(t)) * 1.5).toFixed(this._decimal_places);
    },

    toNewton: function(t) {
        return (Number(t) - 0.33).toFixed(this._decimal_places);
    },

    toInHg: function(p /*, t*/ ) {
        return (p / 33.86530749).toFixed(this._decimal_places);
    },

    toBeaufort: function(w, t) {
        if (w < 0.3)
            return (!t) ? "0" : "(" + _("Calm") + ")";

        else if (w >= 0.3 && w <= 1.5)
            return (!t) ? "1" : "(" + _("Light air") + ")";

        else if (w > 1.5 && w <= 3.4)
            return (!t) ? "2" : "(" + _("Light breeze") + ")";

        else if (w > 3.4 && w <= 5.4)
            return (!t) ? "3" : "(" + _("Gentle breeze") + ")";

        else if (w > 5, 4 && w <= 7.9)
            return (!t) ? "4" : "(" + _("Moderate breeze") + ")";

        else if (w > 7.9 && w <= 10.7)
            return (!t) ? "5" : "(" + _("Fresh breeze") + ")";

        else if (w > 10.7 && w <= 13.8)
            return (!t) ? "6" : "(" + _("Strong breeze") + ")";

        else if (w > 13.8 && w <= 17.1)
            return (!t) ? "7" : "(" + _("Moderate gale") + ")";

        else if (w > 17.1 && w <= 20.7)
            return (!t) ? "8" : "(" + _("Fresh gale") + ")";

        else if (w > 20.7 && w <= 24.4)
            return (!t) ? "9" : "(" + _("Strong gale") + ")";

        else if (w > 24.4 && w <= 28.4)
            return (!t) ? "10" : "(" + _("Storm") + ")";

        else if (w > 28.4 && w <= 32.6)
            return (!t) ? "11" : "(" + _("Violent storm") + ")";

        else
            return (!t) ? "12" : "(" + _("Hurricane") + ")";
    },

    getLocaleDay: function(abr) {
        let days = [_('Sunday'), _('Monday'), _('Tuesday'), _('Wednesday'), _('Thursday'), _('Friday'), _('Saturday')];
        return days[abr];
    },

    getWindDirection: function(deg) {
        let arrows = ["\u2193", "\u2199", "\u2190", "\u2196", "\u2191", "\u2197", "\u2192", "\u2198"];
        let letters = [_('N'), _('NE'), _('E'), _('SE'), _('S'), _('SW'), _('W'), _('NW')];
        let idx = Math.round(deg / 45) % arrows.length;
        return (this._wind_direction) ? arrows[idx] : letters[idx];
    },

    getIconType: function(icon_name) {
        if (!icon_name)
            if (this._getIconType)
                return "-symbolic";
            else
                return "";

        if (this._getIconType)
            if (String(icon_name).search("-symbolic") != -1)
                return icon_name;
            else
                return icon_name + "-symbolic";
            else
        if (String(icon_name).search("-symbolic") != -1)
            return String(icon_name).replace("-symbolic", "");
        else
            return icon_name;
    },

    load_json_async: function(url, params, fun) {
        if (_httpSession === undefined) {
            _httpSession = new Soup.Session();
        }

        let message = Soup.form_request_new_from_hash('GET', url, params);

        _httpSession.queue_message(message, Lang.bind(this, function(_httpSession, message) {

            try {
                if (!message.response_body.data) {
                    fun.call(this, 0);
                    return;
                }
                let jp = JSON.parse(message.response_body.data);
                fun.call(this, jp);
            } catch (e) {
                fun.call(this, 0);
                return;
            }
        }));
        return;
    },

    checkPositionInPanel: function() {
        if (this._old_position_in_panel != this._position_in_panel) {
            switch (this._old_position_in_panel) {
                case WeatherPosition.LEFT:
                    Main.panel._leftBox.remove_actor(this.actor);
                    break;
                case WeatherPosition.CENTER:
                    Main.panel._centerBox.remove_actor(this.actor);
                    break;
                case WeatherPosition.RIGHT:
                    Main.panel._rightBox.remove_actor(this.actor);
                    break;
            }

            let children = null;
            switch (this._position_in_panel) {
                case WeatherPosition.LEFT:
                    children = Main.panel._leftBox.get_children();
                    Main.panel._leftBox.insert_child_at_index(this.actor, children.length);
                    break;
                case WeatherPosition.CENTER:
                    children = Main.panel._centerBox.get_children();
                    Main.panel._centerBox.insert_child_at_index(this.actor, children.length);
                    break;
                case WeatherPosition.RIGHT:
                    children = Main.panel._rightBox.get_children();
                    Main.panel._rightBox.insert_child_at_index(this.actor, 0);
                    break;
            }
            this._old_position_in_panel = this._position_in_panel;
        }

    },

    formatPressure: function(pressure) {
        let pressure_unit = 'hPa';
        switch (this._pressure_units) {
            case WeatherPressureUnits.inHg:
                pressure = this.toInHg(pressure);
                pressure_unit = "inHg";
                break;

            case WeatherPressureUnits.hPa:
                pressure = pressure.toFixed(this._decimal_places);
                pressure_unit = "hPa";
                break;

            case WeatherPressureUnits.bar:
                pressure = (pressure / 1000).toFixed(this._decimal_places);
                pressure_unit = "bar";
                break;

            case WeatherPressureUnits.Pa:
                pressure = (pressure * 100).toFixed(this._decimal_places);
                pressure_unit = "Pa";
                break;

            case WeatherPressureUnits.kPa:
                pressure = (pressure / 10).toFixed(this._decimal_places);
                pressure_unit = "kPa";
                break;

            case WeatherPressureUnits.atm:
                pressure = (pressure * 0.000986923267).toFixed(this._decimal_places);
                pressure_unit = "atm";
                break;

            case WeatherPressureUnits.at:
                pressure = (pressure * 0.00101971621298).toFixed(this._decimal_places);
                pressure_unit = "at";
                break;

            case WeatherPressureUnits.Torr:
                pressure = (pressure * 0.750061683).toFixed(this._decimal_places);
                pressure_unit = "Torr";
                break;

            case WeatherPressureUnits.psi:
                pressure = (pressure * 0.0145037738).toFixed(this._decimal_places);
                pressure_unit = "psi";
                break;
        }
        return parseFloat(pressure).toLocaleString() + ' ' + pressure_unit;
    },

    formatTemperature: function(temperature) {
        switch (this._units) {
            case WeatherUnits.FAHRENHEIT:
                temperature = this.toFahrenheit(temperature);
                break;

            case WeatherUnits.CELSIUS:
                temperature = temperature.toFixed(this._decimal_places);
                break;

            case WeatherUnits.KELVIN:
                temperature = this.toKelvin(temperature);
                break;

            case WeatherUnits.RANKINE:
                temperature = this.toRankine(temperature);
                break;

            case WeatherUnits.REAUMUR:
                temperature = this.toReaumur(temperature);
                break;

            case WeatherUnits.ROEMER:
                temperature = this.toRoemer(temperature);
                break;

            case WeatherUnits.DELISLE:
                temperature = this.toDelisle(temperature);
                break;

            case WeatherUnits.NEWTON:
                temperature = this.toNewton(temperature);
                break;
        }
        return parseFloat(temperature).toLocaleString() + ' ' + this.unit_to_unicode();
    },

    formatWind: function(speed, direction) {
        let unit = 'm/s';
        switch (this._wind_speed_units) {
            case WeatherWindSpeedUnits.MPH:
                speed = (speed * OPENWEATHER_CONV_MPS_IN_MPH).toFixed(this._decimal_places);
                unit = 'mph';
                break;

            case WeatherWindSpeedUnits.KPH:
                speed = (speed * OPENWEATHER_CONV_MPS_IN_KPH).toFixed(this._decimal_places);
                unit = 'km/h';
                break;

            case WeatherWindSpeedUnits.MPS:
                speed = speed.toFixed(this._decimal_places);
                break;

            case WeatherWindSpeedUnits.KNOTS:
                speed = (speed * OPENWEATHER_CONV_MPS_IN_KNOTS).toFixed(this._decimal_places);
                unit = 'kn';
                break;

            case WeatherWindSpeedUnits.FPS:
                speed = (speed * OPENWEATHER_CONV_MPS_IN_FPS).toFixed(this._decimal_places);
                unit = 'ft/s';
                break;

            case WeatherWindSpeedUnits.BEAUFORT:
                speed = this.toBeaufort(speed);
                unit = this.toBeaufort(speed, true);
                break;

        }

        if (!speed)
            return '\u2013';
        else if (speed === 0 || !direction)
            return parseFloat(speed).toLocaleString() + ' ' + unit;
        else // i.e. speed > 0 && direction
            return direction + ' ' + parseFloat(speed).toLocaleString() + ' ' + unit;
    },

    reloadWeatherCurrent: function(interval) {
        if (this._timeoutCurrent) {
            Mainloop.source_remove(this._timeoutCurrent);
        }
        this._timeoutCurrent = Mainloop.timeout_add_seconds(interval, Lang.bind(this, function() {
            this.currentWeatherCache = undefined;
            if (this._connected)
                this.parseWeatherCurrent();
            else
                this.rebuildCurrentWeatherUi();
            return true;
        }));
    },

    reloadWeatherForecast: function(interval) {
        if (this._timeoutForecast) {
            Mainloop.source_remove(this._timeoutForecast);
        }
        this._timeoutForecast = Mainloop.timeout_add_seconds(interval, Lang.bind(this, function() {
            this.forecastWeatherCache = undefined;
            if (this._connected)
                this.parseWeatherForecast();
            else
                this.rebuildFutureWeatherUi();
            return true;
        }));
    },

    destroyCurrentWeather: function() {
        if (this._currentWeather.get_child() !== null)
            this._currentWeather.get_child().destroy();
    },

    destroyFutureWeather: function() {
        if (this._futureWeather.get_child() !== null)
            this._futureWeather.get_child().destroy();
    },

    rebuildCurrentWeatherUi: function() {
        this._weatherInfo.text = _('Loading current weather ...');
        this._weatherIcon.icon_name = 'view-refresh' + this.getIconType();

        this.destroyCurrentWeather();

        // This will hold the icon for the current weather
        this._currentWeatherIcon = new St.Icon({
            icon_size: 72,
            icon_name: 'view-refresh' + this.getIconType(),
            style_class: 'system-menu-action openweather-current-icon'
        });

        this._sunriseIcon = new St.Icon({
            icon_size: 15,
            icon_name: 'weather-clear' + this.getIconType(),
            style_class: 'openweather-sunrise-icon'
        });

        this._sunsetIcon = new St.Icon({
            icon_size: 15,
            icon_name: 'weather-clear-night' + this.getIconType(),
            style_class: 'openweather-sunset-icon'
        });

        this._buildIcon = new St.Icon({
            icon_size: 15,
            icon_name: 'view-refresh' + this.getIconType(),
            style_class: 'openweather-build-icon'
        });

        // The summary of the current weather
        this._currentWeatherSummary = new St.Label({
            text: _('Loading ...'),
            style_class: 'openweather-current-summary'
        });
        this._currentWeatherLocation = new St.Label({
            text: _('Please wait')
        });

        let bb = new St.BoxLayout({
            vertical: true,
            style_class: 'system-menu-action openweather-current-summarybox'
        });
        bb.add_actor(this._currentWeatherLocation);
        bb.add_actor(this._currentWeatherSummary);

        this._currentWeatherSunrise = new St.Label({
            text: '-'
        });
        this._currentWeatherSunset = new St.Label({
            text: '-'
        });
        this._currentWeatherBuild = new St.Label({
            text: '-'
        });

        let ab = new St.BoxLayout({
            style_class: 'openweather-current-infobox'
        });

        ab.add_actor(this._sunriseIcon);
        ab.add_actor(this._currentWeatherSunrise);
        ab.add_actor(this._sunsetIcon);
        ab.add_actor(this._currentWeatherSunset);
        ab.add_actor(this._buildIcon);
        ab.add_actor(this._currentWeatherBuild);
        bb.add_actor(ab);

        // Other labels
        this._currentWeatherCloudiness = new St.Label({
            text: '...'
        });
        this._currentWeatherHumidity = new St.Label({
            text: '...'
        });
        this._currentWeatherPressure = new St.Label({
            text: '...'
        });
        this._currentWeatherWind = new St.Label({
            text: '...'
        });

        let rb = new St.BoxLayout({
            style_class: 'openweather-current-databox'
        });
        let rb_captions = new St.BoxLayout({
            vertical: true,
            style_class: 'popup-status-menu-item openweather-current-databox-captions'
        });
        let rb_values = new St.BoxLayout({
            vertical: true,
            style_class: 'system-menu-action openweather-current-databox-values'
        });
        rb.add_actor(rb_captions);
        rb.add_actor(rb_values);

        rb_captions.add_actor(new St.Label({
            text: _('Cloudiness:')
        }));
        rb_values.add_actor(this._currentWeatherCloudiness);
        rb_captions.add_actor(new St.Label({
            text: _('Humidity:')
        }));
        rb_values.add_actor(this._currentWeatherHumidity);
        rb_captions.add_actor(new St.Label({
            text: _('Pressure:')
        }));
        rb_values.add_actor(this._currentWeatherPressure);
        rb_captions.add_actor(new St.Label({
            text: _('Wind:')
        }));
        rb_values.add_actor(this._currentWeatherWind);

        let xb = new St.BoxLayout();
        xb.add_actor(bb);
        xb.add_actor(rb);

        let box = new St.BoxLayout({
            style_class: 'openweather-current-iconbox'
        });
        box.add_actor(this._currentWeatherIcon);
        box.add_actor(xb);
        this._currentWeather.set_child(box);
    },

    scrollForecastBy: function(delta) {
        if (this._forecastScrollBox === undefined)
            return;
        this._forecastScrollBox.hscroll.adjustment.value += delta;
    },

    rebuildFutureWeatherUi: function(cnt) {
        this.destroyFutureWeather();

        this._forecast = [];
        this._forecastBox = new St.BoxLayout({
            x_align: this._center_forecast ? St.Align.END : St.Align.START,
            style_class: 'openweather-forecast-box'
        });

        this._forecastScrollBox = new St.ScrollView({
            style_class: 'openweather-forecasts'
        });

        let pan = new Clutter.PanAction({
            interpolate: true
        });
        pan.connect('pan', Lang.bind(this, function(action) {

            let[dist, dx, dy] = action.get_motion_delta(0);

            this.scrollForecastBy(-1 * (dx / this._forecastScrollBox.width) * this._forecastScrollBox.hscroll.adjustment.page_size);
            return false;
        }));
        this._forecastScrollBox.add_action(pan);

        this._forecastScrollBox.connect('scroll-event', Lang.bind(this, this._onScroll));
        this._forecastScrollBox.hscroll.connect('scroll-event', Lang.bind(this, this._onScroll));

        this._forecastScrollBox.hscroll.margin_right = 25;
        this._forecastScrollBox.hscroll.margin_left = 25;
        this._forecastScrollBox.hscroll.hide();
        this._forecastScrollBox.vscrollbar_policy = Gtk.PolicyType.NEVER;
        this._forecastScrollBox.hscrollbar_policy = Gtk.PolicyType.AUTOMATIC;
        this._forecastScrollBox.enable_mouse_scrolling = true;
        this._forecastScrollBox.hide();

        this._futureWeather.set_child(this._forecastScrollBox);

        if (cnt === undefined)
            cnt = this._days_forecast;
        for (let i = 0; i < cnt; i++) {
            let forecastWeather = {};

            forecastWeather.Icon = new St.Icon({
                icon_size: 48,
                icon_name: 'view-refresh' + this.getIconType(),
                style_class: 'system-menu-action openweather-forecast-icon'
            });
            forecastWeather.Day = new St.Label({
                style_class: 'popup-status-menu-item openweather-forecast-day'
            });
            forecastWeather.Summary = new St.Label({
                style_class: 'system-menu-action  openweather-forecast-summary'
            });
            forecastWeather.Summary.clutter_text.line_wrap = true;
            forecastWeather.Temperature = new St.Label({
                style_class: 'system-menu-action  openweather-forecast-temperature'
            });

            let by = new St.BoxLayout({
                vertical: true,
                style_class: 'openweather-forecast-databox'
            });
            by.add_actor(forecastWeather.Day);
            if (this._comment_in_forecast)
                by.add_actor(forecastWeather.Summary);
            by.add_actor(forecastWeather.Temperature);

            let bb = new St.BoxLayout({
                style_class: 'openweather-forecast-iconbox'
            });
            bb.add_actor(forecastWeather.Icon);
            bb.add_actor(by);

            this._forecast[i] = forecastWeather;
            this._forecastBox.add_actor(bb);
        }
        this._forecastScrollBox.add_actor(this._forecastBox);
    },

    _onScroll: function(actor, event) {
        let dx = 0;
        let dy = 0;
        switch (event.get_scroll_direction()) {
            case Clutter.ScrollDirection.UP:
                dy = -1;
                break;
            case Clutter.ScrollDirection.DOWN:
                dy = 1;
                break;
                // horizontal scrolling will be handled by the control itself
            default:
                return true;
        }

        this.scrollForecastBy(dy * this._forecastScrollBox.hscroll.adjustment.stepIncrement);
        return false;
    }
});

let openweatherMenu;

function init() {
    Convenience.initTranslations('gnome-shell-extension-openweather');
}

function enable() {
    openweatherMenu = new OpenweatherMenuButton();
    Main.panel.addToStatusArea('openweatherMenu', openweatherMenu);
}

function disable() {
    openweatherMenu.stop();
    openweatherMenu.destroy();
}
