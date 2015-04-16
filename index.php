<html>
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8"/>
    <meta name="viewport" content="width=device-width, user-scalable=yes">

    <title>Plot-It</title>
    <script src="libs/simile/exhibit-api.js" type="text/javascript"></script>
    <script src="libs/simile/extensions/map/map-extension.js" type="text/javascript"></script>
    <script src="libs/simile/extensions/time/time-extension.js" type="text/javascript" type="text/javascript"></script>

    <!-- Static datasets -->
    <link href="transformers/cache/multimedia.json" type="application/json" rel="exhibit/data"/>
    <link href="transformers/cache/biblifo.json" type="application/json" rel="exhibit/data"/>
    <link href="transformers/cache/lglc.json" type="application/json" rel="exhibit/data"/>
    <link href="transformers/cache/orlando.json" type="application/json" rel="exhibit/data"/>


    <link href="libs/simile/styles/common.css" type="text/css" rel="stylesheet"/>
    <link href="libs/simile/styles/styles.css" type="text/css" rel="stylesheet"/>

    <!-- Customizations -->
    <link href="assets/styles/cwrc.css" type="text/css" rel="stylesheet"/>
    <script src="assets/javascripts/simile_override.js" type="text/javascript"></script>
    <script src="assets/javascripts/cwrc.js" type="text/javascript"></script>
</head>
<body>
<table id="frame">
<tr>
<td id="sidebar">
    <header>
        <a href="/">Plot-It</a>
    </header>

    <div ex:role="coordinator" id="bubble-coordinator"></div>

    <section>
        <header>How to use search</header>
        <p>
            Search below by choosing a facet or typing keywords. To restart your search, click on "Reset all Filters"
            above the map.
        </p>
    </section>

    <section>
        <a id="historicalMapToggle" href="#" onclick="CWRC.toggleHistoricalMap();">
            Show Historical Map
        </a>
        <label id="historicalOpacityControls" style="display:none">
            Opacity
            <input id="historicalMapOpacity" type="range" min="0.0" max="1.0" step="0.05"
                   onchange="CWRC.setMapOpacity()"/>
        </label>
    </section>

    <div id="exhibit-browse-panel">
        <strong>Search</strong>

        <div ex:role="facet" ex:facetClass="TextSearch"></div>
        <div ex:role="facet" ex:expression=".startDate" ex:facetLabel="Date Slider" ex:facetClass="Slider"
             ex:horizontal="true" ex:precision="1" ex:histogram="true" ex:width="245px"></div>
        <div ex:role="facet" ex:expression=".group" ex:facetLabel="Collection" ex:height="5em"></div>
    </div>
</td>

<td id="content">
<div class="item" ex:role="lens" style="display: none; overflow: auto; width: 300px; height: 100px;">

    <!-- Begin popup. If only this is set, it will be used for the map markers too. Can be disabled for timeline, and show on map only as well -->
    <table cellpadding="2" width="100%"
           style="font-size: 13px; color: #777; font-family: Arial, Tahoma, Sans-serif;">
        <tr>
            <td width="1">
                <img ex:if-exists=".images" ex:src-content=".images" width="100px"/>
            </td>
            <td width="1">
                <iframe width="150" height="150" ex:if-exists=".videos" ex:src-content=".videos" frameborder="0"
                        allowfullscreen></iframe>
            </td>
            <td>
                <div>
            <span ex:if-exists=".location">
                <b>
                    <small>LOCATION</small>
                </b> <span ex:content=".location"></span><br/>
            </span>
            <span ex:if-exists=".startDate">
                <b>
                    <small>DATE</small>
                </b>
                <span ex:content=".startDate"></span>
                <span ex:if-exists=".endDate">
                 <b>
                     <small>TO</small>
                 </b> <span ex:content=".endDate"></span>
                </span>
                <br/>
            </span>
                    <b>
                        <small>TITLE</small>
                    </b> <span ex:content=".longLabel"></span><br/>
                    <b>
                        <small>NOTES</small>
                    </b> <span ex:content=".description"></span><br/>
                    <b>
                        <small><a target="_blank" ex:if-exists=".urls" ex:href-content=".urls">MORE INFO</a></small>
                    </b>
                    <b>
                        <small><a target="_blank" ex:if-exists=".source" ex:href-content=".source">SOURCE</a>
                        </small>
                    </b>
                </div>
            </td>
        </tr>
    </table>
    <!-- End timeline popup -->
</div>

<div ex:role="coder" ex:coderClass="Color" id="event-colors">
    <span ex:color="#f00">BIBLIFO</span>
    <span ex:color="#0f0">OrlandoEvents</span>
    <span ex:color="#00f">Multimedia</span>
    <span ex:color="#ff0">LGLC</span>
</div>

<!-- Example for customizing icons without any data manipulations -->
<div ex:role="coder" ex:coderClass="Icon" id="event-icons" style="display:none;">
    <span ex:icon="http://simile.mit.edu/painter/painter?renderer=map-marker&shape=circle&width=15&height=15&pinHeight=5&background=f00">BIBLIFO</span>
    <span ex:icon="http://simile.mit.edu/painter/painter?renderer=map-marker&shape=circle&width=15&height=15&pinHeight=5&background=0f0">OrlandoEvents</span>
    <span ex:icon="http://simile.mit.edu/painter/painter?renderer=map-marker&shape=circle&width=15&height=15&pinHeight=5&background=00f">Multimedia</span>
    <span ex:icon="http://simile.mit.edu/painter/painter?renderer=map-marker&shape=circle&width=15&height=15&pinHeight=5&background=ff0">LGLC</span>
</div>

<!-- This sychronizes the showing of popups, i.e. if a map marker is clicked, the popup on the timeline also shows -->
<div ex:role="coordinator" id="event"></div>

<!-- Begin timeline component -->
<div class="cwrc-hide">
    <a id="timelineToggle" href="#" onclick="CWRC.toggleTimeline();">
        Hide Timeline
    </a>
</div>

<div style="margin-top: 5px;" id="timelineArea" ex:role="view"
     ex:viewClass="Timeline"
     ex:label="Timeline"
     ex:start=".startDate"
     ex:end=".endDate"
     ex:bubbleWidth="350"
     ex:topBandPixelsPerUnit="400"
     ex:showSummary="true"
     ex:iconCoder="event-icons"
     ex:iconKey=".group"
     ex:timelineHeight="170"
     ex:selectCoordinator="bubble-coordinator">
</div>
<!-- End timeline component -->

<div class="cwrc-hide">
    <a id="mapToggle" href="#" onclick="CWRC.toggleMap();">
        Hide Map
    </a>
</div>

<div ex:role="viewPanel" id="mapArea">
    <!-- Begin map popup -->
    <!-- This controls a custom popup for the map markers. Disabling it causes the same popup to be used for both timeline and map -->
    <div class="map-lens" ex:role="lens"
         style="display: none; text-align: left; overflow: auto; width: 300px; height: 100px;">
        <table cellpadding="2" width="100%">
            <tr>
                <td width="1">
                    <img ex:if-exists=".images" ex:src-content=".images" width="100px"/>
                </td>
                <td width="1">
                    <iframe width="150" height="150" ex:if-exists=".videos" ex:src-content=".videos" frameborder="0"
                            allowfullscreen></iframe>
                </td>
                <td>
                    <div>
                    <span ex:if-exists=".location">
                        <b>
                            <small>LOCATION</small>
                        </b> <span ex:content=".location"></span><br/>
                    </span>
                    <span ex:if-exists=".startDate">
                        <b>
                            <small>DATE</small>
                        </b>
                        <span ex:content=".startDate"></span>
                        <span ex:if-exists=".endDate">
                         <b>
                             <small>TO</small>
                         </b> <span ex:content=".endDate"></span>
                        </span>
                        <br/>
                    </span>
                        <b>
                            <small>TITLE</small>
                        </b> <span ex:content=".longLabel"></span><br/>
                        <b>
                            <small>NOTES</small>
                        </b> <span ex:content=".description"></span><br/>
                        <b>
                            <small><a target="_blank" ex:if-exists=".urls" ex:href-content=".urls">MORE INFO</a>
                            </small>
                        </b>
                        <b>
                            <small><a target="_blank" ex:if-exists=".source" ex:href-content=".source">SOURCE</a>
                            </small>
                        </b>
                    </div>
                </td>
            </tr>
        </table>
    </div>
    <!-- End map popup -->

    <!-- Begin map control, same map can hold multiple views, only one is needed here -->
    <div ex:role="view"
         ex:viewClass="MapView"
         ex:label="Map View"
         ex:latlng=".latLng"
         ex:latlngOrder="lnglat"
         ex:latlngPairSeparator="|"
         ex:polygon=".polygon"
         ex:polyline=".polyline"
         ex:opacity="0.5"
         ex:borderWidth="4"
         ex:showSummary="false"
         ex:center="38.479394673276445, -115.361328125"
         ex:zoom="3"
         ex:colorCoder="event-colors"
         ex:colorKey=".group"
         ex:shapeWidth="20"
         ex:shapeHeight="20"
         ex:bubbleWidth="310"
         ex:bubbleHeight="100"
         ex:selectCoordinator="bubble-coordinator">
        <!-- needs bubbleheight/width set, otherwise it will draw garbage -->
    </div>
    <!-- End map control -->

    <!-- Begin data details -->
    <div ex:role="view"
         ex:showSummary="true"
         ex:label="List View">
    </div>

    <!-- Begin tabular details -->
    <div ex:role="view"
         ex:viewClass="Tabular"
         ex:showSummary="false"
         ex:label="Grid View"
         ex:columns=".longLabel, .group, .location, .startDate, .endDate"
         ex:columnLabels="Title, Collection, Location, Start, End"
         ex:sortAscending="true"
         ex:sortColumn="0"
         ex:showToolbox="true"
         ex:rowStyler="CWRC.zebraStyler">

        <table border="0" style="display: none;">
            <tr>
                <td width="50%"><span ex:content=".longLabel"></span></td>
                <td width="10%"><span ex:content=".group"></span></td>
                <td width="10%"><span ex:content=".location"></span></td>
                <td width="10%"><span ex:content=".startDate"></span></td>
                <td width="10%"><span ex:content=".endDate"></span></td>
            </tr>
        </table>
    </div>
</div>
</td>
</tr>
</table>
</body>
</html>

