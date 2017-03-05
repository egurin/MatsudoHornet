Date.prototype.format = function (mask, utc) {
    return dateFormat(this, mask, utc);
};

// Attibution: SODA API requests based on this example: https://github.com/chriswhong/soda-leaflet

L.TimeDimension.Layer.SODAHeatMap = L.TimeDimension.Layer.extend({

    initialize: function(options) {
        var heatmapCfg = {
            radius: 15,
            maxOpacity: .8,
            scaleRadius: false,
            useLocalExtrema: false,
            latField: 'lat',
            lngField: 'lng',
            valueField: 'count'
        };
        heatmapCfg = $.extend({}, heatmapCfg, options.heatmatOptions || {});
        var layer = new HeatmapOverlay(heatmapCfg);
        L.TimeDimension.Layer.prototype.initialize.call(this, layer, options);
        this._currentLoadedTime = 0;
        this._currentTimeData = {
            max: this.options.heatmapMax || 10,
            data: []
        };
        this._baseURL = this.options.baseURL || null;
        this._period = this.options.period || "P1M";
    },

    onAdd: function(map) {
        L.TimeDimension.Layer.prototype.onAdd.call(this, map);
        map.addLayer(this._baseLayer);
        if (this._timeDimension) {
            this._getDataForTime(this._timeDimension.getCurrentTime());
        }
    },

    _onNewTimeLoading: function(ev) {
        this._getDataForTime(ev.time);
        return;
    },

    isReady: function(time) {
        return (this._currentLoadedTime == time);
    },

    _update: function() {
        this._baseLayer.setData(this._currentTimeData);
        return true;
    },

    _getDataForTime: function(time) {
        if (!this._baseURL || !this._map) {
            return;
        }
        var url = this._constructQuery(time);
        var fileName = this._getFileName(time);
        
        console.log("fileName:" + fileName);

        $.getJSON(fileName, (function(data) {
            delete this._currentTimeData.data;
            this._currentTimeData.data = [];
            console.log("data:"+data);
            for (var i = 0; i < data.length; i++) {
                var marker = data[i];
                if (marker.location) {
                    this._currentTimeData.data.push({
                        lat: marker.location.latitude,
                        lng: marker.location.longitude,
                        count: 1
                    });
                }
            }
            this._currentLoadedTime = time;
            if (this._timeDimension && time == this._timeDimension.getCurrentTime() && !this._timeDimension.isLoading()) {
                this._update();
            }
            this.fire('timeload', {
                time: time
            });
        }).bind(this));
    },

    _constructQuery: function(time) {
        var bbox = this._map.getBounds();
        var sodaQueryBox = [bbox._northEast.lat, bbox._southWest.lng, bbox._southWest.lat, bbox._northEast.lng];

        var startDate = new Date(time);
        var endDate = new Date(startDate.getTime());
        L.TimeDimension.Util.addTimeDuration(endDate, this._period, false);

        var where = "&$where=created_date > '" +
            startDate.format('yyyy-mm-dd') +
            "' AND created_date < '" +
            endDate.format('yyyy-mm-dd') +
            "' AND within_box(location," +
            sodaQueryBox +
            ")&$order=created_date desc";

        var url = this._baseURL + where;
        return url;
    },

    _getFileName: function(time) {
        var startDate = new Date(time);
        var endDate = new Date(startDate.getTime());
        L.TimeDimension.Util.addTimeDuration(endDate, this._period, false);
        return 'data/Hornet_' + startDate.format('yyyy_mm') + '.json';
    }

});

L.timeDimension.layer.sodaHeatMap = function(options) {
    return new L.TimeDimension.Layer.SODAHeatMap(options);
};

var currentTime = new Date();
currentTime.setUTCDate(1, 0, 0, 0, 0);

var map = L.map('map', {
    zoom: 12,
    fullscreenControl: true,
    timeDimension: true,    
    timeDimensionOptions: {
        //timeInterval: "2016-04-01/" + currentTime.toISOString(), 
        timeInterval: "2016-04-01/2016-12-31", 
        period: "P1M",
        currentTime: currentTime
    },

    center: [35.804602, 139.929651], // 松戸中心座標
});

//var layer = new L.StamenTileLayer("toner-lite");
var layer = new L.tileLayer(
	'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
	{
		attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a>',
	}
);
map.addLayer(layer);

L.Control.TimeDimensionCustom = L.Control.TimeDimension.extend({
    _getDisplayDateFormat: function(date){
        return date.format("mmmm yyyy");
    }    
});
var timeDimensionControl = new L.Control.TimeDimensionCustom({
    playerOptions: {
        buffer: 1,
        minBufferReady: -1,
        startOver: true
    }
});
map.addControl(this.timeDimensionControl);
