﻿/* calendar-view.js */
Exhibit.CalendarView = function (containerElmt, uiContext) {
    this._div = containerElmt;
    this._uiContext = uiContext;
    this._settings = {};
    this._accessors = {getEventLabel: function (itemID, database, visitor) {
        visitor(database.getObject(itemID, "label"));
    }, getProxy: function (itemID, database, visitor) {
        visitor(itemID);
    }, getColorKey: null, getIconKey: null};
    this._currentDate = new Date();
    var view = this;
    this._listener = {onItemsChanged: function () {
        view._reconstruct();
    }};
    uiContext.getCollection().addListener(this._listener);
};
Exhibit.CalendarView._settingSpecs = {"showToolbox": {type: "boolean", defaultValue: true}};
Exhibit.CalendarView._accessorSpecs = [
    {accessorName: "getProxy", attributeName: "proxy"},
    {accessorName: "getDuration", bindings: [
        {attributeName: "start", type: "date", bindingName: "start"},
        {attributeName: "end", type: "date", bindingName: "end", optional: true}
    ]},
    {accessorName: "getColorKey", type: "text"},
    {accessorName: "getColorKey", attributeName: "colorKey", type: "text"},
    {accessorName: "getIconKey", attributeName: "iconKey", type: "text"},
    {accessorName: "getEventLabel", attributeName: "eventLabel", type: "text"},
    {accessorName: "getHoverText", attributeName: "hoverText", type: "text"}
];
Exhibit.CalendarView.create = function (configuration, containerElmt, uiContext) {
    var view = new Exhibit.CalendarView(containerElmt, Exhibit.UIContext.create(configuration, uiContext));
    Exhibit.SettingsUtilities.createAccessors(configuration, Exhibit.CalendarView._accessorSpecs, view._accessors);
    Exhibit.SettingsUtilities.collectSettings(configuration, Exhibit.CalendarView._settingSpecs, view._settings);
    Exhibit.CalendarView._configure(view, configuration);
    view._initializeUI();
    return view;
};
Exhibit.CalendarView.createFromDOM = function (configElmt, containerElmt, uiContext) {
    var configuration = Exhibit.getConfigurationFromDOM(configElmt);
    var view = new Exhibit.CalendarView(containerElmt != null ? containerElmt : configElmt, Exhibit.UIContext.createFromDOM(configElmt, uiContext));
    Exhibit.SettingsUtilities.createAccessorsFromDOM(configElmt, Exhibit.CalendarView._accessorSpecs, view._accessors);
    Exhibit.SettingsUtilities.collectSettingsFromDOM(configElmt, Exhibit.CalendarView._settingSpecs, view._settings);
    Exhibit.SettingsUtilities.collectSettings(configuration, Exhibit.CalendarView._settingSpecs, view._settings);
    Exhibit.CalendarView._configure(view, configuration);
    view._initializeUI();
    return view;
};
Exhibit.CalendarView._configure = function (view, configuration) {
    Exhibit.SettingsUtilities.createAccessors(configuration, Exhibit.CalendarView._accessorSpecs, view._accessors);
    Exhibit.SettingsUtilities.collectSettings(configuration, Exhibit.CalendarView._settingSpecs, view._settings);
    var accessors = view._accessors;
    view._getDuration = function (itemID, database, visitor) {
        accessors.getProxy(itemID, database, function (proxy) {
            accessors.getDuration(proxy, database, visitor);
        });
    };
};
Exhibit.CalendarView.prototype.dispose = function () {
    this._uiContext.getCollection().removeListener(this._listener);
    this._div.innerHTML = "";
    if (this._toolboxWidget) {
        this._toolboxWidget.dispose();
        this._toolboxWidget = null;
    }
    this._dom = null;
    this._div = null;
    this._uiContext = null;
};
Exhibit.CalendarView.prototype._initializeUI = function () {
    var self = this;
    var template = {elmt: this._div, className: "exhibit-collectionView-header", children: [
        {tag: "div", field: "collectionSummaryDiv"},
        {tag: "div", field: "bodyDiv"}
    ]};
    this._dom = SimileAjax.DOM.createDOMFromTemplate(template);
    this._collectionSummaryWidget = Exhibit.CollectionSummaryWidget.create({}, this._dom.collectionSummaryDiv, this._uiContext);
    if (this._settings.showToolbox) {
        this._toolboxWidget = Exhibit.ToolboxWidget.createFromDOM(this._div, this._div, this._uiContext);
        this._toolboxWidget.getGeneratedHTML = function () {
            return self._dom.bodyDiv.innerHTML;
        };
    }
    this._reconstruct();
};
Exhibit.CalendarView.prototype.browse = function (date) {
    if (date !== undefined) {
        this._currentDate = Exhibit.DateUtil.parseDate(date);
    }
    this._reconstruct();
};
Exhibit.CalendarView.prototype._reconstruct = function () {
    var bodyDiv = this._dom.bodyDiv;
    bodyDiv.innerHTML = "";
    var self = this;
    var collection = this._uiContext.getCollection();
    var database = this._uiContext.getDatabase();
    var settings = this._settings;
    var accessors = this._accessors;
    var currentSize = collection.countRestrictedItems();
    var events = {};
    if (currentSize > 0) {
        var currentSet = collection.getRestrictedItems();
        var hasColorKey = (this._accessors.getColorKey != null);
        var hasIconKey = (this._accessors.getIconKey != null && this._iconCoder != null);
        var hasHoverText = (this._accessors.getHoverText != null);
        var colorCodingFlags = {mixed: false, missing: false, others: false, keys: new Exhibit.Set()};
        var iconCodingFlags = {mixed: false, missing: false, others: false, keys: new Exhibit.Set()};
        var addEvent = function (itemID, duration, color, icon, hoverText) {
            var label;
            accessors.getEventLabel(itemID, database, function (v) {
                label = v;
                return true;
            });
            var evt = {itemID: itemID, start: duration.start, end: duration.end, label: label, icon: icon, color: color, hoverText: hoverText, getProperty: function (name) {
                return database.getObject(this._itemID, name);
            }, fillInfoBubble: function (elmt, theme, labeller) {
                self._fillInfoBubble(itemID, elmt, theme, labeller);
            }};
            events[itemID] = evt;
        };
        currentSet.visit(function (itemID) {
            var durations = [];
            self._getDuration(itemID, database, function (duration) {
                if ("start" in duration) {
                    durations.push(duration);
                }
            });
            if (durations.length > 0) {
                var color = null;
                var icon = null;
                var hoverText = null;
                if (hasColorKey) {
                    var colorKeys = new Exhibit.Set();
                    accessors.getColorKey(itemID, database, function (key) {
                        colorKeys.add(key);
                    });
                    color = self._colorCoder.translateSet(colorKeys, colorCodingFlags);
                }
                var icon = null;
                if (hasIconKey) {
                    var iconKeys = new Exhibit.Set();
                    accessors.getIconKey(itemID, database, function (key) {
                        iconKeys.add(key);
                    });
                    icon = self._iconCoder.translateSet(iconKeys, iconCodingFlags);
                }
                if (hasHoverText) {
                    var hoverKeys = new Exhibit.Set();
                    accessors.getHoverText(itemID, database, function (key) {
                        hoverKeys.add(key);
                    });
                    for (var i in hoverKeys._hash) {
                        hoverText = i;
                    }
                }
                for (var i = 0;
                     i < durations.length;
                     i++) {
                    addEvent(itemID, durations[i], color, icon, hoverText);
                }
            }
        });
    }
    this._div.style.display = "none";
    this.buildCal(bodyDiv, events);
    this._div.style.display = "block";
};
Exhibit.CalendarView.daysInMonth = [31, 0, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
Exhibit.CalendarView.prototype.dateToIndex = function (date) {
    return Exhibit.DateUtil.formatDate(date, "yyyyMMdd");
};
Exhibit.CalendarView.prototype.buildCal = function (tableDiv, items) {
    tableDiv.className = "exhibit-calendar";
    var self = this;
    var y = this._currentDate.getFullYear();
    var m = this._currentDate.getMonth() + 1;
    var bom = new Date(y, m - 1, 1);
    bom.start_dow = bom.getDay() + 1;
    var todaydate = new Date();
    var scanfortoday = (y == todaydate.getFullYear() && m == todaydate.getMonth() + 1) ? todaydate.getDate() : 0;
    Exhibit.CalendarView.daysInMonth[1] = (((bom.getFullYear() % 100 !== 0) && (bom.getFullYear() % 4 === 0)) || (bom.getFullYear() % 400 === 0)) ? 29 : 28;
    base = new Date(y, m - 1, 1);
    var eolm = new Date(base.setDate(base.getDate() - 1));
    base = new Date(y, m - 1, 1);
    var bonm = new Date(base.setDate(base.getDate() + Exhibit.CalendarView.daysInMonth[m - 1] + 1));
    var tableHeaderTable = document.createElement("table");
    tableHeaderTable.setAttribute("cellpadding", 0);
    tableHeaderTable.setAttribute("cellspacing", 0);
    tableHeaderTable.className = "exhibit-view-month-header";
    var tableHeaderBody = document.createElement("tbody");
    tableHeaderTable.appendChild(tableHeaderBody);
    var tableHeaderRow = document.createElement("tr");
    tableHeaderBody.appendChild(tableHeaderRow);
    var tablePrevCell = document.createElement("td");
    tablePrevCell.className = "previous-month";
    var tablePrevMonthLink = document.createElement("a");
    tablePrevMonthLink.innerHTML = Exhibit.DateUtil.MONTH_NAMES[eolm.getMonth() + 12];
    tablePrevMonthLink.setAttribute("href", "javascript:void");
    tablePrevCell.appendChild(tablePrevMonthLink);
    tableHeaderRow.appendChild(tablePrevCell);
    var tableCurCell = document.createElement("td");
    tableCurCell.innerHTML = Exhibit.DateUtil.MONTH_NAMES[m - 1] + ", " + y;
    tableCurCell.className = "current-month";
    tableCurCell.setAttribute("allign", "center");
    tableCurCell.setAttribute("width", "100%");
    tableHeaderRow.appendChild(tableCurCell);
    var tableNextCell = document.createElement("td");
    tableNextCell.className = "next-month";
    var tableNextMonthLink = document.createElement("a");
    tableNextMonthLink.innerHTML = Exhibit.DateUtil.MONTH_NAMES[bonm.getMonth() + 12];
    tableNextMonthLink.setAttribute("href", "javascript:void");
    tableNextCell.appendChild(tableNextMonthLink);
    tableHeaderRow.appendChild(tableNextCell);
    tableDiv.appendChild(tableHeaderTable);
    SimileAjax.WindowManager.registerEvent(tablePrevMonthLink, "click", function (elmt, evt, target) {
        self.browse(Exhibit.DateUtil.formatDate(eolm, "y-MM-dd"));
    });
    SimileAjax.WindowManager.registerEvent(tableNextMonthLink, "click", function (elmt, evt, target) {
        self.browse(Exhibit.DateUtil.formatDate(bonm, "y-MM-dd"));
    });
    var table = document.createElement("table");
    table.setAttribute("cellpadding", "0");
    table.setAttribute("cellspacing", "0");
    table.className = "exhibit-view-month";
    var tableBody = document.createElement("tbody");
    table.appendChild(tableBody);
    var tableRow = document.createElement("tr");
    tableRow.setAttribute("align", "center");
    tableBody.appendChild(tableRow);
    for (s = 0;
         s < 7;
         s++) {
        var tableHeaderDayCell = document.createElement("td");
        tableHeaderDayCell.innerHTML = Exhibit.DateUtil.DAY_NAMES[s];
        tableHeaderDayCell.className = "day-header";
        tableHeaderDayCell.setAttribute("align", "center");
        tableRow.appendChild(tableHeaderDayCell);
    }
    var getItemIndex = function (items) {
        var index = {};
        for (itemID in items) {
            var evt = items[itemID];
            if (evt.end == null) {
                var d = self.dateToIndex(evt.start);
                if (index[d] == undefined) {
                    index[d] = [itemID];
                } else {
                    index[d].push(itemID);
                }
            } else {
                var start = new Date(evt.start.getFullYear(), evt.start.getMonth(), evt.start.getDate());
                var end = new Date(evt.end.getFullYear(), evt.start.getMonth(), evt.start.getDate());
                for (var x = start.valueOf();
                     x <= end.valueOf();
                     x += 86400000) {
                    var d = self.dateToIndex(new Date(x));
                    if (index[d] == undefined) {
                        index[d] = [itemID];
                    } else {
                        index[d].push(itemID);
                    }
                }
            }
        }
        return index;
    };
    var itemIndex = getItemIndex(items);
    var tr = null;
    var x, dayNum, curDate, cssClass;
    for (i = 1;
         i <= 42;
         i++) {
        x = i - bom.start_dow;
        if (x < 0) {
            dayNum = Exhibit.CalendarView.daysInMonth[eolm.getMonth()] + x + 1;
            curDate = new Date(eolm.getFullYear(), eolm.getMonth(), dayNum);
            cssClass = "previous-month";
        }
        if ((x >= 0) && (x < Exhibit.CalendarView.daysInMonth[m - 1])) {
            dayNum = i - bom.start_dow + 1;
            curDate = new Date(bom.getFullYear(), m - 1, dayNum);
            cssClass = (x == scanfortoday ? "current-month today" : "current-month");
        }
        if (x >= Exhibit.CalendarView.daysInMonth[m - 1]) {
            dayNum = x - Exhibit.CalendarView.daysInMonth[m - 1] + 1;
            curDate = new Date(bonm.getFullYear(), bonm.getMonth(), dayNum);
            cssClass = "next-month";
        }
        var dateIndex = this.dateToIndex(curDate);
        td = this.buildCell(curDate, cssClass, items, itemIndex[dateIndex]);
        if (i == 1 || i % 7 == 1) {
            if (tr !== null) {
                tableBody.appendChild(tr);
            }
            tr = this.buildRow(curDate);
        }
        tr.appendChild(td);
    }
    tableBody.appendChild(tr);
    tableDiv.appendChild(table);
    return tableDiv;
};
Exhibit.CalendarView.prototype.buildRow = function (date) {
    try {
        var self = this;
        var toDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        toDate = new Date(toDate.setDate(toDate.getDate() + 6));
        var dom = SimileAjax.DOM.createDOMFromString("tr", "");
        dom.elmt.align = "center";
        return dom.elmt;
    } catch (e) {
        alert("buildRow: " + e.message);
    }
};
Exhibit.CalendarView.prototype.buildCell = function (date, cssClass, items, itemIndex) {
    try {
        var self = this;
        var dom = document.createElement("td");
        var cellNum = document.createElement("span");
        cellNum.innerHTML = date.getDate();
        cellNum.className = "calendar-date-title";
        dom.appendChild(cellNum);
        if (itemIndex && itemIndex.length) {
            for (var x = 0;
                 x < itemIndex.length && x < 4;
                 x++) {
                var item = items[itemIndex[x]];
                var cell = document.createElement("span");
                cell.className = "event-title";
                var cellLink = document.createElement("a");
                cellLink.href = Exhibit.Persistence.getItemLink(item.itemID);
                cellLink.setAttribute("ex:itemID", item.itemID);
                cellLink.innerHTML = item.label;
                cell.appendChild(cellLink);
                dom.appendChild(cell);
                SimileAjax.WindowManager.registerEvent(cellLink, "click", function (elmt, evt, target) {
                    Exhibit.ViewUtilities.openBubbleForItems(elmt, [elmt.getAttribute("ex:itemID")], self._uiContext);
                });
            }
            if (itemIndex.length > 4) {
                var viewMore = document.createElement("span");
                var viewMoreLink = document.createElement("a");
                viewMoreLink.innerHTML = "View More +";
                viewMoreLink.href = "javascript:void";
                viewMoreLink.className = "view-more";
                viewMore.appendChild(viewMoreLink);
                SimileAjax.WindowManager.registerEvent(viewMoreLink, "click", function (elmt, evt, target) {
                    Exhibit.ViewUtilities.openBubbleForItems(elmt, itemIndex, self._uiContext);
                });
                dom.appendChild(viewMore);
            }
        }
        dom.className = [cssClass, "day", ((date.getDay() === 0 || date.getDay() == 6) ? "weekend" : "")].join(" ");
        return dom;
    } catch (e) {
        alert("buildCell: " + e.message);
    }
};


/* date-picker-facet.js */
Exhibit.DatePickerFacet = function (containerElmt, uiContext) {
    this._div = containerElmt;
    this._uiContext = uiContext;
    this._beginDate = null;
    this._endDate = null;
    this._settings = {};
    this._dom = null;
    this._datePicker = null;
    this._datePickerTimerLimit = null;
    this._datePickerTimer = null;
    this._enableDragSelection = null;
    this._activeDates = [];
    this._range = {min: null, max: null};
    this._dateFormat = "y-MM-dd";
};
Exhibit.DatePickerFacet._settingsSpecs = {"facetLabel": {type: "text"}, "dateFormat": {type: "text"}, "displayDate": {type: "text"}};
Exhibit.DatePickerFacet.create = function (configuration, containerElmt, uiContext) {
    var uiContext = Exhibit.UIContext.create(configuration, uiContext);
    var facet = new Exhibit.DatePickerFacet(containerElmt, uiContext);
    Exhibit.DatePickerFacet._configure(facet, configuration);
    facet._initializeUI();
    uiContext.getCollection().addFacet(facet);
    return facet;
};
Exhibit.DatePickerFacet.createFromDOM = function (configElmt, containerElmt, uiContext) {
    var configuration = Exhibit.getConfigurationFromDOM(configElmt);
    var uiContext = Exhibit.UIContext.createFromDOM(configElmt, uiContext);
    var facet = new Exhibit.DatePickerFacet((containerElmt !== null ? containerElmt : configElmt), uiContext);
    Exhibit.SettingsUtilities.collectSettingsFromDOM(configElmt, Exhibit.DatePickerFacet._settingsSpecs, facet._settings);
    try {
        var beginDateExpressionString = Exhibit.getAttribute(configElmt, "beginDate");
        if (beginDateExpressionString !== null && beginDateExpressionString.length > 0) {
            facet._beginDate = Exhibit.ExpressionParser.parse(beginDateExpressionString);
        }
        var endDateExpressionString = Exhibit.getAttribute(configElmt, "endDate");
        if (endDateExpressionString !== null && endDateExpressionString.length > 0) {
            facet._endDate = Exhibit.ExpressionParser.parse(endDateExpressionString);
        }
        if (facet._endDate === null) {
            facet._endDate = facet._beginDate;
        }
        var timerLimit = Exhibit.getAttribute(configElmt, "timerLimit");
        if (timerLimit !== null && timerLimit.length > 0) {
            facet._datePickerTimerLimit = timerLimit;
        }
        var dragSelection = Exhibit.getAttribute(configElmt, "dragSelection");
        if (dragSelection !== null && dragSelection.length > 0) {
            facet._enableDragSelection = (dragSelection == "true");
        }
    } catch (e) {
        SimileAjax.Debug.exception(e, "DatePickerFacet: Error processing configuration of date range facet");
    }
    Exhibit.DatePickerFacet._configure(facet, configuration);
    facet._initializeUI();
    uiContext.getCollection().addFacet(facet);
    return facet;
};
Exhibit.DatePickerFacet._configure = function (facet, configuration) {
    Exhibit.SettingsUtilities.collectSettings(configuration, Exhibit.DatePickerFacet._settingsSpecs, facet._settings);
    if ("expression" in configuration) {
        facet._beginDate = Exhibit.ExpressionParser.parse(configuration.expression);
    }
    if (!("facetLabel" in facet._settings)) {
        facet._settings.facetLabel = "missing ex:facetLabel";
        if (facet._beginDate !== null && facet._beginDate.isPath()) {
            var segment = facet._beginDate.getPath().getLastSegment();
            var property = facet._uiContext.getDatabase().getProperty(segment.property);
            if (property !== null) {
                facet._settings.facetLabel = segment.forward ? property.getLabel() : property.getReverseLabel();
            }
        }
    }
};
Exhibit.DatePickerFacet.prototype._initializeUI = function () {
    var self = this;
    this._dom = this.constructFacetFrame(this._div, this._settings.facetLabel);
    if (this._range.min !== null && this._range.max !== null) {
        this._dom.range_min.value = this._range.min;
        this._dom.range_max.value = this._range.max;
    }
    var displayDate = ("displayDate" in this._settings) ? SimileAjax.DateTime.parseIso8601DateTime(this._settings.displayDate) : new Date();
    this._datePicker = Exhibit.DatePickerFacet.DatePicker.create(this._dom.DatePicker, this, displayDate);
    SimileAjax.WindowManager.registerEvent(this._dom.range_min, "keyup", function (elmt, evt, target) {
        self._onDateFieldChange(elmt, evt);
    });
    SimileAjax.WindowManager.registerEvent(this._dom.range_max, "keyup", function (elmt, evt, target) {
        self._onDateFieldChange(elmt, evt);
    });
};
Exhibit.DatePickerFacet.prototype.constructFacetFrame = function (div, facetLabel) {
    var self = this;
    var domString = ["<div class='exhibit-facet-header'>", "<div class='exhibit-facet-header-filterControl' id='clearSelectionsDiv' title='", Exhibit.FacetUtilities.l10n.clearSelectionsTooltip, "'>", "<span id='filterCountSpan'></span>", "<img id='checkImage' />", "</div>", "<span class='exhibit-facet-header-title'>", facetLabel, "</span>", "</div>", "<div class='exhibit-date-picker' id='DatePicker'></div>", "<div class='exhibit-date-picker-text'><input type='text' id='range_min' size='10' style='width:auto;'> - ", "<input type='text' id='range_max' size='10' style='width:auto;'></div>"].join("");
    var dom = SimileAjax.DOM.createDOMFromString(div, domString, {checkImage: Exhibit.UI.createTranslucentImage("images/black-check.png")});
    dom.setSelectionCount = function (display, count) {
        this.filterCountSpan.innerHTML = count;
        this.clearSelectionsDiv.style.display = display ? "block" : "none";
    };
    SimileAjax.WindowManager.registerEvent(dom.clearSelectionsDiv, "click", function (elmt, evt, target) {
        self._clearSelections();
    });
    return dom;
};
Exhibit.DatePickerFacet.prototype.hasRestrictions = function () {
    return(this._range.min !== null && this._range.max !== null);
};
Exhibit.DatePickerFacet.prototype.clearAllRestrictions = function () {
    var restrictions = this._range;
    if (this.hasRestrictions) {
        this._range = {min: null, max: null};
        this._notifyCollection();
    }
    this._dom.range_min.value = "";
    this._dom.range_max.value = "";
    this._datePicker.update();
    this._dom.setSelectionCount(this.hasRestrictions(), 0);
    return restrictions;
};
Exhibit.DatePickerFacet.prototype.applyRestrictions = function (restrictions) {
    this.setRange(restrictions);
};
Exhibit.DatePickerFacet.prototype.restrict = function (items) {
    if (!this.hasRestrictions()) {
        this._dom.setSelectionCount(this.hasRestrictions(), 0);
        return items;
    } else {
        var min = SimileAjax.DateTime.parseIso8601DateTime(this._range.min);
        var max = SimileAjax.DateTime.parseIso8601DateTime(this._range.max);
        this._dom.setSelectionCount(this.hasRestrictions(), Math.floor((max - min) / (24 * 60 * 60 * 1000)));
        var database = this._uiContext.getDatabase();
        if (this._beginDate !== null && this._endDate !== null) {
            var beginDateExpression = this._beginDate;
            var endDateExpression = this._endDate;
            var set = new Exhibit.Set();
            SimileAjax.DateTime.incrementByInterval(max, SimileAjax.DateTime.DAY);
            items.visit(function (item) {
                var beginDateVal = beginDateExpression.evaluateOnItem(item, database);
                var endDateVal = endDateExpression.evaluateOnItem(item, database);
                if (beginDateVal.size > 0) {
                    var beginDate = SimileAjax.DateTime.parseIso8601DateTime(beginDateVal.values.toArray()[0]);
                    var endDate = (endDateVal.size > 0) ? SimileAjax.DateTime.parseIso8601DateTime(endDateVal.values.toArray()[0]) : beginDate;
                    if ((beginDate <= max) && (endDate >= min)) {
                        set.add(item);
                    }
                }
            });
            return set;
        } else {
            var path = this._beginDate.getPath();
            var set = new Exhibit.Set();
            set.addSet(path.rangeBackward(min, max.setUTCDate(max.getUTCDate() + 1), false, items, database).values);
            return set;
        }
    }
};
Exhibit.DatePickerFacet.prototype._notifyCollection = function () {
    this._uiContext.getCollection().onFacetUpdated(this);
};
Exhibit.DatePickerFacet.prototype._clearSelections = function () {
    this.clearAllRestrictions();
};
Exhibit.DatePickerFacet.prototype.update = function (items) {
    var activeDates = {};
    beginDateExp = this._beginDate;
    endDateExp = this._endDate || beginDate;
    items.visit(function (item) {
        var beginDateVal = beginDateExp.evaluateOnItem(item, database);
        if (beginDateVal) {
            var beginDate = SimileAjax.DateTime.parseIso8601DateTime(beginDateVal.values.toArray()[0]);
            var endDateVal = endDateExp.evaluateOnItem(item, database);
            var endDate = SimileAjax.DateTime.parseIso8601DateTime(endDateVal.values.toArray()[0]);
            while (beginDate <= endDate) {
                var year = beginDate.getFullYear();
                var month = beginDate.getMonth();
                var date = beginDate.getDate();
                activeDates[year + "#" + month + "#" + date] = true;
                SimileAjax.DateTime.incrementByInterval(beginDate, SimileAjax.DateTime.DAY);
            }
        }
    });
    this._activeDates = activeDates;
    this._datePicker.update();
};
Exhibit.DatePickerFacet.prototype._onDateFieldChange = function (elmt, evt) {
    if (this._dom.range_min.value && Exhibit.DateUtil.parseDate(this._dom.range_min.value) && this._dom.range_max.value && Exhibit.DateUtil.parseDate(this._dom.range_max.value)) {
        min_date = Exhibit.DateUtil.parseDate(this._dom.range_min.value);
        max_date = Exhibit.DateUtil.parseDate(this._dom.range_max.value);
        if (min_date && max_date) {
            var self = this;
            if (max_date < min_date) {
                old_min = this._dom.range_min.value;
                this._dom.range_min.value = this._dom.range_max.value;
                this._dom.range_max.value = old_min;
            }
            var newRange = {min: this._dom.range_min.value, max: this._dom.range_max.value};
            if (newRange.min != this._range.min || newRange.max != this._range.max) {
                var oldRange = this._range;
                SimileAjax.History.addLengthyAction(function () {
                    self.setRange(newRange);
                    self._datePicker.update();
                }, function () {
                    self.setRange(oldRange);
                    self._datePicker.update();
                }, "Clear date range search");
            }
        }
    }
};
Exhibit.DatePickerFacet.prototype.setRange = function (range) {
    if (range.min !== null && range.max !== null) {
        min_date = Exhibit.DateUtil.parseDate(range.min);
        max_date = Exhibit.DateUtil.parseDate(range.max);
        this._dom.range_min.value = Exhibit.DateUtil.formatDate(min_date, this._dateFormat);
        this._dom.range_max.value = Exhibit.DateUtil.formatDate(max_date, this._dateFormat);
    }
    if (range.min != this._range.min || range.max != this._range.max) {
        this._range = range;
        this._notifyCollection();
    }
};
Exhibit.DatePickerFacet.prototype.dateInCurrentRange = function (date) {
    if (this._range.min !== null && this._range.max !== null) {
        min_date = Exhibit.DateUtil.parseDate(this._range.min);
        max_date = Exhibit.DateUtil.parseDate(this._range.max);
        return(date >= (min_date - 24 * 60 * 60 * 1000)) && (date <= max_date);
    } else {
        return false;
    }
};
Exhibit.DatePickerFacet.prototype.dateRangeInCurrentRange = function (range) {
    return this.dateInCurrentRange(range.min) && this.dateInCurrentRange(range.max);
};
Exhibit.DatePickerFacet.prototype.changeDate = function (date) {
    this._datePicker.update(Exhibit.DateUtil.parseDate(date));
};
Exhibit.DatePickerFacet.prototype.selectDate = function (date) {
    var self = this;
    if (this._datePickerTimer) {
        clearTimeout(this._datePickerTimer);
    }
    if (this._dom.range_min.value.trim() !== "" && this._dom.range_max.value.trim() !== "") {
        this._dom.range_min.value = "";
        this._dom.range_max.value = "";
    }
    if (this._dom.range_min.value.trim() === "" && this._dom.range_max.value.trim() === "") {
        this._datePicker.startHighlighting(date);
        if (this._datePickerTimerLimit && !this._enableDragSelection) {
            this._datePickerTimer = setTimeout(function () {
                self.selectDate(self._dom.range_min.value);
            }, this._datePickerTimerLimit);
        }
    }
    if (this._dom.range_min.value.trim() === "") {
        this._dom.range_min.value = date;
    } else {
        this._dom.range_max.value = date;
        this._datePicker.stopHighlighting();
    }
    this._onDateFieldChange();
};
Exhibit.DatePickerFacet.prototype.selectRange = function (fromDate, toDate) {
    this._dom.range_min.value = fromDate;
    this._dom.range_max.value = toDate;
    this._onDateFieldChange();
};
Exhibit.DatePickerFacet.prototype.exportFacetSelection = function () {
    if (this._range.min && this._range.max) {
        return this._range.min + "," + this._range.max;
    }
};
Exhibit.DatePickerFacet.prototype.importFacetSelection = function (settings) {
    var urlRange = settings.split(",");
    if (urlRange.length > 1) {
        this.setRange({min: urlRange[0], max: urlRange[1]});
        this._datePicker.update();
    }
};


/* date-picker.js */
Exhibit.DatePickerFacet.DatePicker = function (div, facet, date) {
    this._div = div;
    this._facet = facet;
    this._currentDate = date;
    this._highlight = false;
};
Exhibit.DatePickerFacet.DatePicker.create = function (div, facet, date) {
    DatePicker = new Exhibit.DatePickerFacet.DatePicker(div, facet, date);
    DatePicker._div.appendChild(DatePicker.buildCal());
    return DatePicker;
};
Exhibit.DatePickerFacet.DatePicker.prototype.update = function (date) {
    if (typeof date == "undefined") {
        date = this._currentDate;
    }
    while (this._div.hasChildNodes()) {
        this._div.removeChild(this._div.lastChild);
    }
    this._currentDate = date;
    this._div.appendChild(DatePicker.buildCal());
};
Exhibit.DatePickerFacet.DatePicker.daysInMonth = [31, 0, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
Exhibit.DatePickerFacet.DatePicker.prototype.buildCal = function () {
    var y = this._currentDate.getFullYear();
    var m = this._currentDate.getMonth() + 1;
    var self = this;
    var bom = new Date(y, m - 1, 1);
    bom.start_dow = bom.getDay() + 1;
    var todaydate = new Date();
    var scanfortoday = (y == todaydate.getFullYear() && m == todaydate.getMonth() + 1) ? todaydate.getDate() : 0;
    Exhibit.DatePickerFacet.DatePicker.daysInMonth[1] = (((bom.getFullYear() % 100 !== 0) && (bom.getFullYear() % 4 === 0)) || (bom.getFullYear() % 400 === 0)) ? 29 : 28;
    base = new Date(y, m - 1, 1);
    var eolm = new Date(base.setDate(base.getDate() - 1));
    base = new Date(y, m - 1, 1);
    var bonm = new Date(base.setDate(base.getDate() + Exhibit.DatePickerFacet.DatePicker.daysInMonth[m - 1] + 1));
    var tableDiv = document.createElement("div");
    var tableHeaderTable = document.createElement("table");
    tableHeaderTable.cellpadding = 0;
    tableHeaderTable.cellspacing = 0;
    tableHeaderTable.className = "exhibit-month-header";
    tableDiv.appendChild(tableHeaderTable);
    var tableHeaderBody = document.createElement("tbody");
    tableHeaderTable.appendChild(tableHeaderBody);
    var tableHeaderRow = document.createElement("tr");
    tableHeaderBody.appendChild(tableHeaderRow);
    var tablePrevCell = document.createElement("td");
    tablePrevCell.className = "previous-month";
    var tablePrevMonthLink = document.createElement("a");
    tablePrevMonthLink.innerHTML = Exhibit.DateUtil.MONTH_NAMES[eolm.getMonth() + 12];
    tablePrevMonthLink.setAttribute("href", "javascript:{}");
    tablePrevCell.appendChild(tablePrevMonthLink);
    tableHeaderRow.appendChild(tablePrevCell);
    var tableCurCell = document.createElement("td");
    tableCurCell.innerHTML = Exhibit.DateUtil.MONTH_NAMES[m - 1] + ", " + y;
    tableCurCell.className = "current-month";
    tableCurCell.setAttribute("allign", "center");
    tableCurCell.setAttribute("width", "100%");
    tableHeaderRow.appendChild(tableCurCell);
    var tableNextCell = document.createElement("td");
    tableNextCell.className = "next-month";
    var tableNextMonthLink = document.createElement("a");
    tableNextMonthLink.innerHTML = Exhibit.DateUtil.MONTH_NAMES[bonm.getMonth() + 12];
    tableNextMonthLink.setAttribute("href", "javascript:{}");
    tableNextCell.appendChild(tableNextMonthLink);
    tableHeaderRow.appendChild(tableNextCell);
    var table = document.createElement("table");
    tableDiv.appendChild(table);
    var tableBody = document.createElement("tbody");
    table.appendChild(tableBody);
    var tableRow = document.createElement("tr");
    tableRow.setAttribute("align", "center");
    tableBody.appendChild(tableRow);
    var tableCell = document.createElement("td");
    tableCell.setAttribute("align", "center");
    tableRow.appendChild(tableCell);
    var tableSubHeaderRow = document.createElement("tr");
    tableBody.appendChild(tableSubHeaderRow);
    var tableHeaderFillerCell = document.createElement("td");
    tableHeaderFillerCell.innerHTML = "&nbsp;";
    tableHeaderFillerCell.className = "day-header exhibit-week-selector";
    tableSubHeaderRow.appendChild(tableHeaderFillerCell);
    for (s = 0;
         s < 7;
         s++) {
        var tableHeaderDayCell = document.createElement("td");
        tableHeaderDayCell.innerHTML = "SMTWTFS".substr(s, 1);
        tableHeaderDayCell.className = "day-header";
        tableSubHeaderRow.appendChild(tableHeaderDayCell);
    }
    table.className = "exhibit-date-picker";
    table.setAttribute("cellpadding", "0");
    table.setAttribute("cellspacing", "0");
    SimileAjax.WindowManager.registerEvent(tablePrevMonthLink, "click", function (elmt, evt, target) {
        self._facet.changeDate(Exhibit.DateUtil.formatDate(eolm, self._facet._dateFormat));
        SimileAjax.DOM.cancelEvent(evt);
        return false;
    }, SimileAjax.WindowManager.getBaseLayer());
    SimileAjax.WindowManager.registerEvent(tableNextMonthLink, "click", function (elmt, evt, target) {
        self._facet.changeDate(Exhibit.DateUtil.formatDate(bonm, self._facet._dateFormat));
        SimileAjax.DOM.cancelEvent(evt);
        return false;
    }, SimileAjax.WindowManager.getBaseLayer());
    var tr = null;
    var x, dayNum, curDate, cssClass;
    for (i = 1;
         i <= 35;
         i++) {
        x = i - bom.start_dow;
        if (x < 0) {
            dayNum = Exhibit.DatePickerFacet.DatePicker.daysInMonth[eolm.getMonth()] + x + 1;
            curDate = new Date(eolm.getFullYear(), eolm.getMonth(), dayNum);
            cssClass = "previousMonth";
        }
        if ((x >= 0) && (x < Exhibit.DatePickerFacet.DatePicker.daysInMonth[m - 1])) {
            dayNum = i - bom.start_dow + 1;
            curDate = new Date(bom.getFullYear(), m - 1, dayNum);
            cssClass = (x == scanfortoday ? "currentMonth today" : "currentMonth");
        }
        if (x >= Exhibit.DatePickerFacet.DatePicker.daysInMonth[m - 1]) {
            dayNum = x - Exhibit.DatePickerFacet.DatePicker.daysInMonth[m - 1] + 1;
            curDate = new Date(bonm.getFullYear(), bonm.getMonth(), dayNum);
            cssClass = "nextMonth";
        }
        td = this.buildCell(curDate, cssClass);
        if (i == 1 || i % 7 == 1) {
            if (tr !== null) {
                tableBody.appendChild(tr);
            }
            tr = this.buildRow(curDate);
        }
        tr.appendChild(td);
    }
    tableBody.appendChild(tr);
    return tableDiv;
};
Exhibit.DatePickerFacet.DatePicker.prototype.buildRow = function (date) {
    try {
        var self = this;
        var toDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        toDate = new Date(toDate.setDate(toDate.getDate() + 6));
        var dom = SimileAjax.DOM.createDOMFromString("tr", "");
        var subDom = SimileAjax.DOM.createDOMFromString("td", '<a href="javascript:{}" id="link"><span>></span></a>');
        subDom.elmt.className = "exhibit-week-selector";
        subDom.link.className = (this._facet.dateRangeInCurrentRange({min: date, max: toDate}) ? "selected" : "");
        SimileAjax.WindowManager.registerEvent(subDom.link, "click", function (elmt, evt, target) {
            self._facet.selectRange(Exhibit.DateUtil.formatDate(date, self._facet._dateFormat), Exhibit.DateUtil.formatDate(toDate, self._facet._dateFormat));
            SimileAjax.DOM.cancelEvent(evt);
            return false;
        }, SimileAjax.WindowManager.getBaseLayer());
        dom.elmt.align = "center";
        dom.elmt.appendChild(subDom.elmt);
        return dom.elmt;
    } catch (e) {
        alert("buildRow: " + e.message);
    }
};
Exhibit.DatePickerFacet.DatePicker.prototype.buildCell = function (date, cssClass) {
    try {
        var self = this;
        var dom = SimileAjax.DOM.createDOMFromString("td", date.getDate());
        var hasItems = this._facet._activeDates[date.getFullYear() + "#" + date.getMonth() + "#" + date.getDate()];
        dom.elmt.className = [cssClass, "day", (this._facet.dateInCurrentRange(date) ? "selected" : ""), ((date.getDay() === 0 || date.getDay() == 6) ? "weekend" : ""), (hasItems ? "has-items" : "")].join(" ");
        dom.elmt.id = Exhibit.DateUtil.formatDate(date, self._facet._dateFormat).replace(/[^a-zA-Z 0-9]+/g, "");
        dom.elmt.setAttribute("ex:date", Exhibit.DateUtil.formatDate(date, self._facet._dateFormat));
        if (self._facet._enableDragSelection) {
            SimileAjax.WindowManager.registerEvent(dom.elmt, "mousedown", function (elmt, evt, target) {
                self._facet.selectDate(Exhibit.DateUtil.formatDate(date, self._facet._dateFormat));
                SimileAjax.DOM.cancelEvent(evt);
                return false;
            }, SimileAjax.WindowManager.getBaseLayer());
            SimileAjax.WindowManager.registerEvent(dom.elmt, "mouseup", function (elmt, evt, target) {
                self._facet.selectDate(Exhibit.DateUtil.formatDate(date, self._facet._dateFormat));
                SimileAjax.DOM.cancelEvent(evt);
                return false;
            }, SimileAjax.WindowManager.getBaseLayer());
        } else {
            SimileAjax.WindowManager.registerEvent(dom.elmt, "click", function (elmt, evt, target) {
                self._facet.selectDate(Exhibit.DateUtil.formatDate(date, self._facet._dateFormat));
                SimileAjax.DOM.cancelEvent(evt);
                return false;
            }, SimileAjax.WindowManager.getBaseLayer());
        }
        SimileAjax.WindowManager.registerEvent(dom.elmt, "mouseover", function (elmt, evt, target) {
            self.highlight(elmt);
            SimileAjax.DOM.cancelEvent(evt);
            return false;
        }, SimileAjax.WindowManager.getBaseLayer());
        return dom.elmt;
    } catch (e) {
        alert("buildCell: " + e.message);
    }
};
Exhibit.DatePickerFacet.DatePicker.prototype.highlight = function (elmt) {
    if (this._highlight) {
        $("td.day").each(function (i) {
            $("#" + this.id).removeClass("highlight");
        });
        center = Exhibit.DateUtil.parseDate(this._highlight);
        end = Exhibit.DateUtil.parseDate(Exhibit.getAttribute(elmt, "ex:date"));
        if (end < center) {
            old_end = end;
            end = center;
            center = old_end;
        }
        while (center <= end) {
            $("#" + Exhibit.DateUtil.formatDate(center, this._facet._dateFormat).replace(/[^a-zA-Z 0-9]+/g, "")).addClass("highlight");
            center.setDate(center.getDate() + 1);
        }
    }
};
Exhibit.DatePickerFacet.DatePicker.prototype.startHighlighting = function (date) {
    this._highlight = date;
    dateObj = Exhibit.DateUtil.parseDate(date);
    elmtId = Exhibit.DateUtil.formatDate(dateObj, this._facet._dateFormat).replace(/[^a-zA-Z 0-9]+/g, "");
    elmt = $("#" + elmtId).addClass("highlight");
};
Exhibit.DatePickerFacet.DatePicker.prototype.stopHighlighting = function (date) {
    this._highlight = false;
};


/* date-util.js */
Exhibit.DateUtil = new Object();
Exhibit.DateUtil.MONTH_NAMES = new Array("January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec");
Exhibit.DateUtil.DAY_NAMES = new Array("Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat");
Exhibit.DateUtil.LZ = function (x) {
    return(x < 0 || x > 9 ? "" : "0") + x;
};
Exhibit.DateUtil.isDate = function (val, format) {
    var date = Exhibit.DateUtil.getDateFromFormat(val, format);
    if (date == 0) {
        return false;
    }
    return true;
};
Exhibit.DateUtil.compareDates = function (date1, dateformat1, date2, dateformat2) {
    var d1 = Exhibit.DateUtil.getDateFromFormat(date1, dateformat1);
    var d2 = Exhibit.DateUtil.getDateFromFormat(date2, dateformat2);
    if (d1 == 0 || d2 == 0) {
        return -1;
    } else {
        if (d1 > d2) {
            return 1;
        }
    }
    return 0;
};
Exhibit.DateUtil.formatDate = function (date, format) {
    format = format + "";
    var result = "";
    var i_format = 0;
    var c = "";
    var token = "";
    var y = date.getYear() + "";
    var M = date.getMonth() + 1;
    var d = date.getDate();
    var E = date.getDay();
    var H = date.getHours();
    var m = date.getMinutes();
    var s = date.getSeconds();
    var yyyy, yy, MMM, MM, dd, hh, h, mm, ss, ampm, HH, H, KK, K, kk, k;
    var value = new Object();
    if (y.length < 4) {
        y = "" + (y - 0 + 1900);
    }
    value["y"] = "" + y;
    value["yyyy"] = y;
    value["yy"] = y.substring(2, 4);
    value["M"] = M;
    value["MM"] = Exhibit.DateUtil.LZ(M);
    value["MMM"] = Exhibit.DateUtil.MONTH_NAMES[M - 1];
    value["NNN"] = Exhibit.DateUtil.MONTH_NAMES[M + 11];
    value["d"] = d;
    value["dd"] = Exhibit.DateUtil.LZ(d);
    value["E"] = Exhibit.DateUtil.DAY_NAMES[E + 7];
    value["EE"] = Exhibit.DateUtil.DAY_NAMES[E];
    value["H"] = H;
    value["HH"] = Exhibit.DateUtil.LZ(H);
    if (H == 0) {
        value["h"] = 12;
    } else {
        if (H > 12) {
            value["h"] = H - 12;
        } else {
            value["h"] = H;
        }
    }
    value["hh"] = Exhibit.DateUtil.LZ(value["h"]);
    if (H > 11) {
        value["K"] = H - 12;
    } else {
        value["K"] = H;
    }
    value["k"] = H + 1;
    value["KK"] = Exhibit.DateUtil.LZ(value["K"]);
    value["kk"] = Exhibit.DateUtil.LZ(value["k"]);
    if (H > 11) {
        value["a"] = "PM";
    } else {
        value["a"] = "AM";
    }
    value["m"] = m;
    value["mm"] = Exhibit.DateUtil.LZ(m);
    value["s"] = s;
    value["ss"] = Exhibit.DateUtil.LZ(s);
    while (i_format < format.length) {
        c = format.charAt(i_format);
        token = "";
        while ((format.charAt(i_format) == c) && (i_format < format.length)) {
            token += format.charAt(i_format++);
        }
        if (value[token] != null) {
            result = result + value[token];
        } else {
            result = result + token;
        }
    }
    return result;
};
Exhibit.DateUtil._isInteger = function (val) {
    var digits = "1234567890";
    for (var i = 0;
         i < val.length;
         i++) {
        if (digits.indexOf(val.charAt(i)) == -1) {
            return false;
        }
    }
    return true;
};
Exhibit.DateUtil._getInt = function (str, i, minlength, maxlength) {
    for (var x = maxlength;
         x >= minlength;
         x--) {
        var token = str.substring(i, i + x);
        if (token.length < minlength) {
            return null;
        }
        if (Exhibit.DateUtil._isInteger(token)) {
            return token;
        }
    }
    return null;
};
Exhibit.DateUtil.getDateFromFormat = function (val, format) {
    val = val + "";
    format = format + "";
    var i_val = 0;
    var i_format = 0;
    var c = "";
    var token = "";
    var token2 = "";
    var x, y;
    var now = new Date();
    var year = now.getYear();
    var month = now.getMonth() + 1;
    var date = 1;
    var hh = now.getHours();
    var mm = now.getMinutes();
    var ss = now.getSeconds();
    var ampm = "";
    while (i_format < format.length) {
        c = format.charAt(i_format);
        token = "";
        while ((format.charAt(i_format) == c) && (i_format < format.length)) {
            token += format.charAt(i_format++);
        }
        if (token == "yyyy" || token == "yy" || token == "y") {
            if (token == "yyyy") {
                x = 4;
                y = 4;
            }
            if (token == "yy") {
                x = 2;
                y = 2;
            }
            if (token == "y") {
                x = 2;
                y = 4;
            }
            year = Exhibit.DateUtil._getInt(val, i_val, x, y);
            if (year == null) {
                return 0;
            }
            i_val += year.length;
            if (year.length == 2) {
                if (year > 70) {
                    year = 1900 + (year - 0);
                } else {
                    year = 2000 + (year - 0);
                }
            }
        } else {
            if (token == "MMM" || token == "NNN") {
                month = 0;
                for (var i = 0;
                     i < Exhibit.DateUtil.MONTH_NAMES.length;
                     i++) {
                    var month_name = Exhibit.DateUtil.MONTH_NAMES[i];
                    if (val.substring(i_val, i_val + month_name.length).toLowerCase() == month_name.toLowerCase()) {
                        if (token == "MMM" || (token == "NNN" && i > 11)) {
                            month = i + 1;
                            if (month > 12) {
                                month -= 12;
                            }
                            i_val += month_name.length;
                            break;
                        }
                    }
                }
                if ((month < 1) || (month > 12)) {
                    return 0;
                }
            } else {
                if (token == "EE" || token == "E") {
                    for (var i = 0;
                         i < Exhibit.DateUtil.DAY_NAMES.length;
                         i++) {
                        var day_name = Exhibit.DateUtil.DAY_NAMES[i];
                        if (val.substring(i_val, i_val + day_name.length).toLowerCase() == day_name.toLowerCase()) {
                            i_val += day_name.length;
                            break;
                        }
                    }
                } else {
                    if (token == "MM" || token == "M") {
                        month = Exhibit.DateUtil._getInt(val, i_val, token.length, 2);
                        if (month == null || (month < 1) || (month > 12)) {
                            return 0;
                        }
                        i_val += month.length;
                    } else {
                        if (token == "dd" || token == "d") {
                            date = Exhibit.DateUtil._getInt(val, i_val, token.length, 2);
                            if (date == null || (date < 1) || (date > 31)) {
                                return 0;
                            }
                            i_val += date.length;
                        } else {
                            if (token == "hh" || token == "h") {
                                hh = Exhibit.DateUtil._getInt(val, i_val, token.length, 2);
                                if (hh == null || (hh < 1) || (hh > 12)) {
                                    return 0;
                                }
                                i_val += hh.length;
                            } else {
                                if (token == "HH" || token == "H") {
                                    hh = Exhibit.DateUtil._getInt(val, i_val, token.length, 2);
                                    if (hh == null || (hh < 0) || (hh > 23)) {
                                        return 0;
                                    }
                                    i_val += hh.length;
                                } else {
                                    if (token == "KK" || token == "K") {
                                        hh = Exhibit.DateUtil._getInt(val, i_val, token.length, 2);
                                        if (hh == null || (hh < 0) || (hh > 11)) {
                                            return 0;
                                        }
                                        i_val += hh.length;
                                    } else {
                                        if (token == "kk" || token == "k") {
                                            hh = Exhibit.DateUtil._getInt(val, i_val, token.length, 2);
                                            if (hh == null || (hh < 1) || (hh > 24)) {
                                                return 0;
                                            }
                                            i_val += hh.length;
                                            hh--;
                                        } else {
                                            if (token == "mm" || token == "m") {
                                                mm = Exhibit.DateUtil._getInt(val, i_val, token.length, 2);
                                                if (mm == null || (mm < 0) || (mm > 59)) {
                                                    return 0;
                                                }
                                                i_val += mm.length;
                                            } else {
                                                if (token == "ss" || token == "s") {
                                                    ss = Exhibit.DateUtil._getInt(val, i_val, token.length, 2);
                                                    if (ss == null || (ss < 0) || (ss > 59)) {
                                                        return 0;
                                                    }
                                                    i_val += ss.length;
                                                } else {
                                                    if (token == "a") {
                                                        if (val.substring(i_val, i_val + 2).toLowerCase() == "am") {
                                                            ampm = "AM";
                                                        } else {
                                                            if (val.substring(i_val, i_val + 2).toLowerCase() == "pm") {
                                                                ampm = "PM";
                                                            } else {
                                                                return 0;
                                                            }
                                                        }
                                                        i_val += 2;
                                                    } else {
                                                        if (val.substring(i_val, i_val + token.length) != token) {
                                                            return 0;
                                                        } else {
                                                            i_val += token.length;
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    if (i_val != val.length) {
        return 0;
    }
    if (month == 2) {
        if (((year % 4 == 0) && (year % 100 != 0)) || (year % 400 == 0)) {
            if (date > 29) {
                return 0;
            }
        } else {
            if (date > 28) {
                return 0;
            }
        }
    }
    if ((month == 4) || (month == 6) || (month == 9) || (month == 11)) {
        if (date > 30) {
            return 0;
        }
    }
    if (hh < 12 && ampm == "PM") {
        hh = hh - 0 + 12;
    } else {
        if (hh > 11 && ampm == "AM") {
            hh -= 12;
        }
    }
    var newdate = new Date(year, month - 1, date, hh, mm, ss);
    return newdate.getTime();
};
Exhibit.DateUtil.parseDate = function (val) {
    var preferEuro = (arguments.length == 2) ? arguments[1] : false;
    generalFormats = new Array("y-M-d", "MMM d, y", "MMM d,y", "y-MMM-d", "d-MMM-y", "MMM d");
    monthFirst = new Array("M/d/y", "M-d-y", "M.d.y", "MMM-d", "M/d", "M-d");
    dateFirst = new Array("d/M/y", "d-M-y", "d.M.y", "d-MMM", "d/M", "d-M");
    var checkList = new Array("generalFormats", preferEuro ? "dateFirst" : "monthFirst", preferEuro ? "monthFirst" : "dateFirst");
    var d = null;
    for (var i = 0;
         i < checkList.length;
         i++) {
        var l = window[checkList[i]];
        for (var j = 0;
             j < l.length;
             j++) {
            d = Exhibit.DateUtil.getDateFromFormat(val, l[j]);
            if (d != 0) {
                return new Date(d);
            }
        }
    }
    return null;
};
