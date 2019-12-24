var mymap;
var token;
var idparcours;
var drawnItems;
var drawControl;
var type;
var layer;
var points;
var departIcon;
var passageIcon;
var arriveeIcon;
var posteIcon;
var markers;

window.onload = function init(){
    mymap = L.map('mapid',{
        zoomControl:false
    });
    longitude = -2.93;
    latitude = 48.2;
    echelle = 9;
    token = $('#mapid').data('token');
    idparcours = $('#mapid').data('idparcours');

    departIcon = L.icon({
        iconUrl: asset_images+'/depart.png',
        iconSize: [40, 60],
        iconAnchor: [0, 60],
    });
    passageIcon = L.icon({
        iconUrl: asset_images+'/passage.png',
        iconSize: [31, 47],
        iconAnchor: [16, 47],
    });
    arriveeIcon = L.icon({
        iconUrl: asset_images+'/arrivee.png',
        iconSize: [40, 60],
        iconAnchor: [0, 60],
    });
    posteIcon = L.icon({
        iconUrl: asset_images+'/poste.png',
        iconSize: [40, 60],
        iconAnchor: [0, 60],
    });

    mymap.on('load', function(e){
        
        let zoomControl = addZoom();
        this.addControl(zoomControl);

        let controlImport = importGPX();
        controlImport.addTo(mymap);
        
        L.Control.geocoder().addTo(this);

        traduireToolbar();
        
        drawnItems = new L.FeatureGroup();
        this.addLayer(drawnItems);
    
        drawControl = addDrawControl(drawnItems);
        this.addControl(drawControl);

        markers = L.layerGroup().addTo(this);

        $.when(dessinerParcours().done(function(data, textStatus, jqXHR){                
            console.log('Parcours dessiné avec succès');   
        }));
    });
 
    mymap.on('draw:created', function(e) {
        type = e.layerType;
        layer = e.layer;
        points = [];

        if (type === 'polyline') {
            drawnItems.addLayer(layer);

            layer.getLatLngs().forEach(function(point) {
                points.push(point);
            });
            
            let trace = {"idParcours": idparcours}
            $.when(creerTrace(trace, points).done(function(data, textStatus, jqXHR){
                layer.idtrace = data.id
            }));
        }
        else if ( type === 'polygon') {
            drawnItems.addLayer(layer);
        }
        else if (type === 'marker') {
            creerPoste();
            drawnItems.addLayer(layer);
        }
        else if (type === 'circlemarker') {
            drawnItems.addLayer(layer);
        }
        else if (type === 'circle') {
            drawnItems.addLayer(layer);
        }
        else if (type === 'rectangle') {
            drawnItems.addLayer(layer);
        }
    });
        
    mymap.on('draw:edited', function(e){
        
        e.layers.eachLayer(function(layer){

            let markers_to_remove = [];

            for (let i = 0; i < markers.getLayers().length; i++) {       
                if( markers.getLayers()[i].idtrace == layer.idtrace 
                    || markers.getLayers()[i].idtrace.id == layer.idtrace){
                    markers_to_remove.push(markers.getLayers()[i])
                }
            }
            for (let j = 0; j < markers_to_remove.length; j++) {
                markers.removeLayer(markers_to_remove[j])
            }

            $.when(supprimerTrace(layer.idtrace).done(function(data, textStatus, jqXHR){
                points = [];
                layer.getLatLngs().forEach(function(point) {
                    points.push(point);
                });
                
                let trace = {"idParcours": idparcours}
                $.when(creerTrace(trace, points).done(function(data, textStatus, jqXHR){
                    layer.idtrace = data.id
                }));
            }));
        });
    });

    mymap.on('draw:deleted', function(e) {
        e.layers.eachLayer(function(layer){

            let markers_to_remove = [];

            for (let i = 0; i < markers.getLayers().length; i++) {       
                if( markers.getLayers()[i].idtrace == layer.idtrace 
                    || markers.getLayers()[i].idtrace.id == layer.idtrace){
                    markers_to_remove.push(markers.getLayers()[i])
                }
            }
            for (let j = 0; j < markers_to_remove.length; j++) {
                markers.removeLayer(markers_to_remove[j])
            }

            supprimerTrace(layer.idtrace);
        });
    });

    mymap.setView([latitude, longitude], echelle);
    L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(mymap);

    positionUser();
}

function addZoom(){
    //Toolbar Zoom
    let zoomControl = new L.control.zoom({
        zoomInTitle: "Zoomer",
        zoomOutTitle: "Dézoomer"
    });

    return zoomControl;
}

function traduireToolbar(){
    console.log('Début de la traduction barre d\'outils...');

    //Toolbar Visible
    L.drawLocal.draw.toolbar.buttons.polyline = 'Créer un parcours';
    L.drawLocal.draw.toolbar.buttons.marker = 'Créer un nouveau poste';
    L.drawLocal.edit.toolbar.buttons.editDisabled = "Aucun élément à éditer";
    L.drawLocal.edit.toolbar.buttons.removeDisabled = "Aucun élément à supprimer";
    
    //Toolbar Visible Element Placé
    L.drawLocal.edit.toolbar.buttons.edit = "Editer parcours/points";
    L.drawLocal.edit.toolbar.buttons.remove = "Supprimer parcours/points";

    //Toolbar Polyline
    L.drawLocal.draw.toolbar.actions.text = "Annuler";
    L.drawLocal.draw.toolbar.actions.title = "Annuler";
    L.drawLocal.draw.toolbar.finish.text = "Terminer";
    L.drawLocal.draw.toolbar.finish.title = "Terminer la création du parcours";
    L.drawLocal.draw.toolbar.undo.text = "Supprimer le dernier point";
    L.drawLocal.draw.toolbar.undo.title = "Supprimer le dernier point dessiné";

    //Toolbar Polyline Texte Carte
    L.drawLocal.draw.handlers.polyline.tooltip.start = 'Cliquer sur la carte pour positionner le point de départ';
    L.drawLocal.draw.handlers.polyline.tooltip.cont = 'Cliquer sur la carte pour continuer le tracé';
    L.drawLocal.draw.handlers.polyline.tooltip.end = 'Cliquer sur le dernier point pour finaliser le parcours';

    //Toolbar Marker Texte
    L.drawLocal.draw.handlers.marker.tooltip.start = 'Cliquer sur la carte pour placer un point d\'intérêt';

    //Toolbar Edition
    L.drawLocal.edit.toolbar.actions.cancel.text = "Annuler";
    L.drawLocal.edit.toolbar.actions.cancel.title = "Annuler les derniers changements";
    L.drawLocal.edit.toolbar.actions.save.text = "Sauvegarder";
    L.drawLocal.edit.toolbar.actions.save.title = "Sauvegarder les changements";
    
    //Toolbar Edition Texte
    L.drawLocal.edit.handlers.edit.tooltip.text = "Maintenir un élément pour le déplacer";
    L.drawLocal.edit.handlers.edit.tooltip.subtext = "Retirer un point de passage en double-cliquant dessus";
    
    //Toolbar Suppression
    L.drawLocal.edit.toolbar.actions.clearAll.text = "Tout supprimer";
    L.drawLocal.edit.toolbar.actions.clearAll.title = "Supprimer tous les éléments sur la carte";

    //Toolbar Suppression Texte
    L.drawLocal.edit.handlers.remove.tooltip.text = "Cliquez sur un élément pour le supprimer";
    
    console.log('Fin de traduction...');
}

function dessinerParcours(){

    return $.ajax({  
        url: 'http://raidtracker.ddns.net/raid_tracker_api/web/app.php/api/traces/parcours/' + idparcours,  
        type: 'GET',
        dataType: 'json',  
        headers: {"X-Auth-Token": token},
        beforeSend: function(){
            $("#loader").show();
        },
        success: function(data){
            for (let i = 0; i < data.length; i++) {
                recupererTrace(data[i].id)
            }
        },
        error: function (xhr, textStatus, errorThrown) {  
            console.log('Erreur lors de la récupération du parcours ['+ idparcours + ']');  
        },
        complete:function(data){   
            $("#loader").hide();
        }
    });
}

function supprimerParcours(id) {
    return $.ajax({  
        url: 'http://raidtracker.ddns.net/raid_tracker_api/web/app.php/api/traces/parcours/'+ id,  
        type: 'DELETE',
        dataType: 'json',  
        headers: {"X-Auth-Token": token},
        beforeSend: function(){
            $("#loader").show();
        },
        success: function(data){
            console.log('Parcours supprimé ['+ data.id +']')
        },
        error: function (xhr, textStatus, errorThrown) {  
            console.log('Erreur lors de l\'enregistrement du point');  
        },
        complete:function(data){   
            $("#loader").hide();
        }
    });
}

function creerTrace(trace, points){
    return $.ajax({  
        url: 'http://raidtracker.ddns.net/raid_tracker_api/web/app.php/api/traces',  
        type: 'POST',
        dataType: 'json',
        headers: {
            "X-Auth-Token": token
        },
        data: trace,
        beforeSend: function(){
            $("#loader").show();
        },
        success: function (data, textStatus, xhr) {  
            let point = [];
            let sizeTabPoints = points.length;
            
            for (let i = 0; i < sizeTabPoints; i++) {
                point["idTrace"] = data['id'];
                point["ordre"] = i;
                point["lat"] = points[i].lat;
                point["lon"] = points[i].lng;

                if(i == 0){
                    point["type"] = 1;
                    let depart = L.marker([point["lat"], point["lon"]], {icon: departIcon})
                        .addTo(markers)
                        .bindPopup('Point de départ');
                    depart.idtrace = point['idTrace'];
                }
                else if(i == sizeTabPoints-1){
                    point["type"] = 2;
                    let arrivee = L.marker([point["lat"], point["lon"]], {icon: arriveeIcon})
                        .addTo(markers)
                        .bindPopup('Point de d\'arrivée');
                    arrivee.idtrace = point['idTrace'];
                }
                else{
                    point["type"] = 0;
                }

                creerPoint(point);
            }
            console.log('Nouveau tracé créé ['+ data.id +']');
        },  
        error: function (xhr, textStatus, errorThrown) {  
            console.log(textStatus);
        },
        complete:function(data){   
            $("#loader").hide();
        }
    });
}

function recupererTrace(id){
    return $.ajax({  
        url: 'http://raidtracker.ddns.net/raid_tracker_api/web/app.php/api/points/traces/' + id,  
        type: 'GET',
        dataType: 'json',  
        headers: {"X-Auth-Token": token},
        beforeSend: function(){
            $("#loader").show();
        },
        success: function(data){
            let tab_points= [];

            for (let i = 0; i < data.length; i++) {
                let point = []
                point.push(data[i]['lat']);
                point.push(data[i]['lon']);

                if(data[i]['type'] == 1){
                    let depart = L.marker([data[i]['lat'], data[i]['lon']], {icon: departIcon})
                        .addTo(markers)
                        .bindPopup('Point de départ');
                    depart.idtrace = data[i]['idTrace']  
                }
                else if(data[i]['type'] == 2){
                    let arrivee = L.marker([data[i]['lat'], data[i]['lon']], {icon: arriveeIcon})
                        .addTo(markers)
                        .bindPopup('Point d\'arrivée');
                    arrivee.idtrace = data[i]['idTrace']
                }
                tab_points.push(point);
            }
            
            let polylines = L.polyline(tab_points, {
                color:'green',
                weight: 10
            });
            polylines.idtrace = id;
            drawnItems.addLayer(polylines);
        },
        error: function (xhr, textStatus, errorThrown) {  
            console.log('Erreur lors de la récupération des points du tracé [' + id + ']');  
        },
        complete:function(data){   
            $("#loader").hide();
        }
    });
}

function supprimerTrace(id){
    return $.ajax({
        url: 'http://raidtracker.ddns.net/raid_tracker_api/web/app.php/api/traces/' + id,  
        type: 'DELETE',
        dataType: 'json',
        headers: {
            "X-Auth-Token": token
        },
        beforeSend: function(){
            $("#loader").show();
        },
        success: function(data){
            console.log('Tracé supprimé [' + id + ']');
        },
        error: function (xhr, textStatus, errorThrown) {  
            console.log('Erreur lors de la suppression du tracé ['+ id +']');  
        },
        complete:function(data){   
            $("#loader").hide();
        }
    });
}

function creerPoint(point){
    return $.ajax({  
        url: 'http://raidtracker.ddns.net/raid_tracker_api/web/app.php/api/points',  
        type: 'POST',
        dataType: 'json',  
        headers: {"X-Auth-Token": token}, 
        data: { ...point },
        beforeSend: function(){
            $("#loader").show();
        },
        success: function(data){
            console.log(data)
        },
        error: function (xhr, textStatus, errorThrown) {  
            console.log('Erreur lors de l\'enregistrement du point');  
        },
        complete:function(data){   
            $("#loader").hide();
        }
    });
}

function creerPoste(poste=null){
    if(poste == null){

        poste = {
            "idPoint": 7708,
            "type": "Buvette",
            "nombre": 5,
            "heureDebut": "29/01/2019 10:00",
            "heureFin": "29/01/2019 12:00"
        }
    }

    return $.ajax({  
        url: 'http://raidtracker.ddns.net/raid_tracker_api/web/app.php/api/postes',  
        type: 'POST',
        dataType: 'json',  
        headers: {"X-Auth-Token": token}, 
        data: poste,
        beforeSend: function(){
            $("#loader").show();
        },
        success: function(data){
            console.log('Nouveau poste créé ['+ data.id +']');
        },
        error: function (xhr, textStatus, errorThrown) {  
            console.log('Erreur lors de l\'enregistrement du poste');  
        },
        complete:function(data){   
            $("#loader").hide();
        }
    });
}

function importGPX(){

    let style = {
        color:'purple',
        opacity: 0,
        fillOpacity: 0.5,
        weight: 1,
        clickable: false
    };
    L.Control.FileLayerLoad.TITLE = 'Importer parcours (GPX, GeoJSON)';
    L.Control.FileLayerLoad.LABEL = '<img class="icon" src="/raid_tracker/web/images/folder.png">';

    return L.Control.fileLayerLoad({
        fitBounds: true,
        layerOptions: {
            style: style,
            pointToLayer: function (data, latlng){
                return L.circleMarker(latlng, {style: style});
            },
            onEachFeature: function (data, layer) {
                let tab_points_import_gpx = [];
                
                layer.editing.latlngs.forEach(function(element) {
                    tab_points_import_gpx.push(element);
                });
                
                layer.setStyle({
                    color: 'red',
                    weight: 10,
                    opacity: 1,
                    clickable:true
                })
                
                let trace = {"idParcours": idparcours}
                $.when(creerTrace(trace, tab_points_import_gpx[0]).done(function(data, textStatus, jqXHR){
                    layer.idtrace = data.id
                }));
                
                drawnItems.addLayer(layer);
            }
        }
    })
}

function addDrawControl(drawnItems){
    let drawControl = new L.Control.Draw({
        position:'topleft',
        edit: {
            featureGroup: drawnItems,
            remove:true
        },
        draw: {
            polyline: {
                shapeOptions: {
                    color: 'orange',
                    weight: 10,
                }
            },
            circle: false,
            polygon: false,
            marker: {
                repeatMode:true
            },
            circlemarker: false,
            rectangle: false,
        },
    });
    return drawControl;
}

function positionUser() {
    if(navigator.geolocation) {        
        navigator.geolocation.getCurrentPosition(showPosition);                
    }
    else {
        alert("La localisation n'est pas disponible avec votre navigateur !");
    }
}

function showPosition(position) {
    latitude = position.coords.latitude;
    longitude = position.coords.longitude;
    echelle = 18;

    mymap.setView([latitude, longitude], echelle);
        L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(mymap);

    let latlng = [latitude, longitude];
    let marker = L.marker([latitude, longitude]).addTo(mymap);
    let popup = L.popup().setLatLng(latlng).setContent('<p>Vous êtes ici<br>Latitude: '+ latitude +'<br>Longitude: '+longitude+'</p>').openOn(mymap);
    marker.bindPopup(popup).openPopup();
}