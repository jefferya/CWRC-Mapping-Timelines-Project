ko.components.register('timeline', {
    template: {element: 'timeline-template'},

    /**
     * A timeline with markers at each time point in the data set.
     *
     * Records with multiple locations have all markers "linked", so that selecting one will highlight all.
     *
     * For developers:
     * The coordianate systems can get confusing sometimes. Remember that each measurement is either going to be in
     * true pixels or scaled pixels. Please leave comments to make it clear what unit a distance is in.
     */
    viewModel: function (params) {
        var self = this;

        self.previousDragPosition = null;

        self.unplottableCount = ko.pureComputed(function () {
            // can't use self.records here, because records is filtered.
            return CWRC.rawData().length - CWRC.select(CWRC.rawData(), function (item) {
                    return item.startDate;
                }).length;
        });

        // full filtered records, sorted by start
        self.records = ko.pureComputed(function () {
            var records, timeDiff;

            // fetch only the data that have non-null start dates, sort by start date.
            records = CWRC.select(CWRC.filteredData(), function (item) {
                return item.startDate;
            }).sort(function (a, b) {
                timeDiff = CWRC.toStamp(a) - CWRC.toStamp(b);

                if (timeDiff == 0 && a.label)
                    return a.label.localeCompare(b.label);
                else
                    return timeDiff;
            });

            return records;
        });

        self.canvas = {
            getElement: function () {
                return document.querySelector('#timeline-viewport .canvas');
            },
            pixelsPerMs: ko.observable(1 / CWRC.toMillisec('day')),
            rowHeight: ko.observable(CWRC.Timeline.LABEL_HEIGHT),
            zoomTransform: ko.pureComputed(function () {
                var scale = 1.0; // TODO: actually do this

                return 'scale(' + scale + ',' + scale + ')';
            }),
            bounds: {
                height: ko.pureComputed(function () {
                    return self.canvas.rowCount() * self.canvas.rowHeight();
                }),
                width: ko.pureComputed(function () {
                    var timespan, startStamp, endStamp;

                    startStamp = self.canvas.earliestStamp();
                    endStamp = self.canvas.latestStamp();

                    if (startStamp == endStamp) {
                        return '100%';
                    } else {
                        timespan = (endStamp - startStamp); // in ms

                        return self.canvas.stampToPixels(timespan) + self.canvas.stampToPixels(CWRC.toMillisec('year')) + 'px'; // convert to px
                    }
                })
            },
            earliestStamp: ko.pureComputed(function () {
                var firstRecord = self.records()[0];

                return (firstRecord ? new Date(firstRecord.startDate) : new Date()).getTime();
            }),
            latestStamp: ko.pureComputed(function () {
                var records, lastRecord;

                records = self.records();
                lastRecord = records[records.length - 1];

                return (lastRecord ? new Date(lastRecord.endDate || lastRecord.startDate) : new Date()).getTime();
            }),
            earliestDate: ko.pureComputed(function () {
                return new Date(self.canvas.earliestStamp());
            }),
            latestDate: ko.pureComputed(function () {
                return new Date(self.canvas.latestStamp());
            }),
            rowCount: ko.observable(),
            stampToPixels: function (stamp) {
                return stamp * self.canvas.pixelsPerMs();
            },
            pixelsToStamp: function (px) {
                return px / self.canvas.pixelsPerMs();
            },
            rowToPixels: function (row) {
                return row * self.canvas.rowHeight();
            },
            pixelsToRow: function (px) {
                return px / self.canvas.rowHeight();
            }
        };

        // TODO: merge into class
        self.canvas.timelineTokens = ko.computed(function () {
            var startStamp, endStamp, duration, tokens, unplacedRecords, cutoff, rowIndex, nextRecordIndex;

            unplacedRecords = self.records().slice(); // slice to duplicate array, otherwise we would alter the cached value
            tokens = [];
            rowIndex = -1;

            nextRecordIndex = function (cutoff, records) {
                for (var i = 0; i < records.length; i++) {
                    if (CWRC.toStamp(records[i]) >= cutoff)
                        return i;
                }
            };

            while (unplacedRecords.length > 0) {
                var record, recordIndex, isPastCutoff;

                isPastCutoff = cutoff > CWRC.toStamp(unplacedRecords[unplacedRecords.length - 1]);

                if (typeof cutoff === 'undefined' || isPastCutoff) {
                    cutoff = CWRC.toStamp(unplacedRecords[0]);
                    rowIndex++;
                }

                recordIndex = nextRecordIndex(cutoff, unplacedRecords);

                // TODO: switch to using findIndex
                //recordIndex = unplacedRecords.findIndex(function (record) {
                //    return CWRC.toStamp(record) >= cutoff;
                //});

                record = unplacedRecords.splice(recordIndex, 1)[0];

                startStamp = CWRC.toStamp(record.startDate);
                endStamp = CWRC.toStamp(record.endDate) || startStamp;

                // duration can be artificially set to label size to ensure there's enough room for a label
                // TODO: replace this with actual sizing for points
                duration = Math.max(Math.abs(endStamp - startStamp), self.canvas.pixelsToStamp(CWRC.toMillisec('year') * self.canvas.pixelsPerMs()));

                tokens.push(new CWRC.Timeline.Token({
                    xPos: self.canvas.stampToPixels(startStamp - self.canvas.earliestStamp()),
                    row: rowIndex,
                    width: self.canvas.stampToPixels(duration),
                    data: record
                }));

                cutoff = startStamp + duration;
            }

            self.canvas.rowCount(rowIndex + 10);

            return tokens;
        });

        self.viewport = {
            canvas: self.canvas, // TODO: pass into constructor
            getElement: function () {
                return document.getElementById('timeline-viewport');
            },
            // Bounds are stored as time stamps on X axis, number of rows as Y axis. Both are doubles to be
            // rounded only once when converted to pixels
            bounds: {
                leftStamp: ko.observable(self.canvas.earliestStamp()), // TODO: see if we can init this to the param (better than the timeout)
                topRow: ko.observable(0),
                rightStamp: function () {
                    return self.viewport.bounds.leftStamp() +
                        self.canvas.pixelsToStamp(self.viewport.getElement().offsetWidth);
                },
                bottomRow: function () {
                    return self.viewport.bounds.topRow() +
                        self.canvas.pixelsToRow(self.viewport.getElement().offsetHeight);
                },
                timespan: function () {
                    return this.rightStamp() - this.leftStamp();
                },
                visibleRows: function () {
                    return this.bottomRow() - this.topRow();
                },
                contains: function (stamp, row) {
                    var viewportBounds;

                    viewportBounds = self.viewport.bounds; // todo: remove this once in class

                    return (stamp >= viewportBounds.leftStamp() && stamp <= viewportBounds.rightStamp()) &&
                        (row >= viewportBounds.topRow() && row <= viewportBounds.bottomRow())
                }
            },
            panTo: function (stamp, row) {
                var viewportBounds;

                viewportBounds = self.viewport.bounds; // todo: remove this once in class

                viewportBounds.leftStamp(stamp - (viewportBounds.timespan() / 2));
                viewportBounds.topRow(row - (viewportBounds.visibleRows() / 2) + 0.5); // 0.5 b/c labels are offset by a half row
            },
            // Moves the viewport X pixels right, and Y pixels down.
            panPixels: function (deltaX, deltaY) {
                var newStamp, newRow;

                newStamp = self.viewport.bounds.leftStamp() - self.canvas.pixelsToStamp(deltaX);
                newRow = self.viewport.bounds.topRow() - self.canvas.pixelsToRow(deltaY);

                // TODO: either remove these limits and use a transform, or make these limits an extender on the obervable
                // limit panning to ~ the canvas size
                newStamp = Math.max(newStamp, self.canvas.earliestStamp());
                newStamp = Math.min(newStamp, self.canvas.latestStamp() + CWRC.toMillisec('year') - self.viewport.bounds.timespan())

                newRow = Math.max(newRow, 0);
                newRow = Math.min(newRow, self.canvas.rowCount() - self.viewport.bounds.visibleRows());

                self.viewport.bounds.leftStamp(newStamp);
                self.viewport.bounds.topRow(newRow);
            }
        };

        // TODO: re-enable
        //self.ruler = new CWRC.Timeline.Ruler(self.viewport.bounds, self.canvas.pixelsPerMs());

        // Wrapped in a timeout to run after the actual canvas is initialized.
        // TODO: this is a hack, but there isn't currently any event to hook into for when the timeline is done loading
        setTimeout(function () {
            var startFocusStamp = CWRC.toStamp(params['startDate']);

            if (startFocusStamp)
                self.viewport.panTo(startFocusStamp, 0)
        }, 100);

        CWRC.selected.subscribe(function (selectedRecord) {
            var token, recordStamp;

            // TODO: make startDate generic
            recordStamp = CWRC.toStamp(selectedRecord.startDate);

            token = self.canvas.timelineTokens().find(function (token) {
                return token.data == selectedRecord;
            });

            if (!self.viewport.bounds.contains(recordStamp, token.row))
                self.viewport.panTo(recordStamp, token.row);
        });

        // TODO move to viewport constructor
        self.viewport.bounds.leftStamp.subscribe(function (newVal) {
            var stampDistance = newVal - self.canvas.earliestStamp();

            self.viewport.getElement().scrollLeft = Math.round(self.canvas.stampToPixels(stampDistance));
        });

        self.viewport.bounds.topRow.subscribe(function (newVal) {
            self.viewport.getElement().scrollTop = Math.round(self.canvas.rowToPixels(newVal));
        });

        /**
         *
         * @param viewFocusX In raw pixels, relative to viewport
         * @param viewFocusY In raw pixels, relative to viewport
         * @param zoomIn Boolean: true zoom in, false zoom out
         */
        self.zoom = function (viewFocusX, viewFocusY, zoomIn) { // TODO: move into canvas or viewport
            var stepScaleFactor;

            stepScaleFactor = zoomIn ? (1.1) : (1 / 1.1);

            //console.log('focuxX ', viewFocusX)
            //console.log('stamp ', self.canvas.pixelsToStamp(viewFocusX))
            //console.log('zoom focus at ', new Date(self.canvas.pixelsToStamp(viewFocusX)))

            self.canvas.pixelsPerMs(self.canvas.pixelsPerMs() * stepScaleFactor);
            self.canvas.rowHeight(self.canvas.rowHeight() * stepScaleFactor);

            //self.viewport.panTo(self.viewport.bounds.leftStamp() + self.canvas.pixelsToStamp(viewFocusX),
            //    self.viewport.bounds.topRow() + self.canvas.pixelsToRow(viewFocusY))

        };

        self.scrollHandler = function (viewModel, scrollEvent) {
            var mouseX, mouseY;

            //  mouseX, Y are relative to viewport, in unscaled pixels
            mouseX = scrollEvent.clientX - self.viewport.getElement().getBoundingClientRect().left;
            mouseY = scrollEvent.clientY - self.viewport.getElement().getBoundingClientRect().top;

            self.zoom(mouseX, mouseY, scrollEvent.deltaY < 0);

            return false; // prevent regular page scrolling.
        };

        /*
         * recordMouseUp and recordMouseDown are split (ie. not recordClick) to allow drag to abort the event
         * so that it doesn't select when you drag over a record. - retm
         */
        self.recordMouseUp = function (token) {
            if (self.clickingOnRecord)
                CWRC.selected(token.data)
        };

        self.recordMouseDown = function (record) {
            self.clickingOnRecord = true
        };

        self.dragStart = function (element, mouseEvent) {
            var x, y;

            if (mouseEvent.touches && mouseEvent.touches.length >= 2) {
                self.pinching = true;
            } else {
                x = mouseEvent.screenX || mouseEvent.touches[0].screenX;
                y = mouseEvent.screenY || mouseEvent.touches[0].screenY;

                self.previousDragPosition = {screenX: x, screenY: y};
            }
        };

        // Note: These are on window rather than the component so that dragging doesn't cut off when the
        // mouse leaves the widget. This is Google Maps behaviour adopted for consistency.
        var dragHandler = function (mouseEvent) {
            var deltaX, deltaY, mouseX, mouseY;

            if (!self.previousDragPosition)
                return;

            // would've used simpler event.movementX and movementY, but Firefox doesn't support yet.
            mouseX = mouseEvent.screenX || mouseEvent.touches[0].screenX;
            mouseY = mouseEvent.screenY || mouseEvent.touches[0].screenY;

            deltaX = mouseX - self.previousDragPosition.screenX;
            deltaY = mouseY - self.previousDragPosition.screenY;

            self.viewport.panPixels(deltaX, deltaY);

            var x = mouseEvent.screenX || mouseEvent.touches[0].screenX;
            var y = mouseEvent.screenY || mouseEvent.touches[0].screenY;
            self.previousDragPosition = {screenX: x, screenY: y};

            self.clickingOnRecord = false;
        };

        var stopDragHandler = function (mouseEvent) {
            self.previousDragPosition = null;
        };

        window.addEventListener('mouseup', stopDragHandler);
        window.addEventListener('touchend', stopDragHandler);

        window.addEventListener('mousemove', dragHandler);
        window.addEventListener('touchmove', function (touchEvent) {
            if (touchEvent.touches.length > 1) {
                alert('Zoom not yet supported on touch.');
                //self.zoom(something)
            } else {
                dragHandler(touchEvent);
            }
        });
    }
});

CWRC.Timeline = CWRC.Timeline || {};

CWRC.Timeline.LABEL_HEIGHT = 24;//px   //or 1.5; //em
CWRC.Timeline.SELECTED_LAYER = 10;

CWRC.Timeline.__tokenId = 1;

(function () {
    CWRC.Timeline.Token = function (params) {
        var self = this;

        this.id = CWRC.Timeline.__tokenId++;

        this.xPos = params.xPos;
        this.row = params.row;

        this.width = params.width;
        this.height = (this.row + 1) * CWRC.Timeline.LABEL_HEIGHT + 'px';

        this.data = params.data;

        this.isSelected = ko.pureComputed(function () {
            return self.data == CWRC.selected();
        });

        this.layer = function () {
            return this.isSelected() ? CWRC.Timeline.SELECTED_LAYER : -this.row;
        };
    };

    CWRC.Timeline.Ruler = function (viewport, pixelsPerMs) {
        var self = this;

        this.startStamp = ko.pureComputed(function () {
            return viewport.bounds.startStamp();
        });

        this.endStamp = ko.pureComputed(function () {
            return viewport.bounds.endStamp();
        });

        this.startDate = ko.pureComputed(function () {
            return new Date(self.startStamp());
        });

        this.endDate = ko.pureComputed(function () {
            return new Date(self.endStamp());
        });

        this.minorUnit = ko.pureComputed(function () {
            var msSpan = (self.getElement().offsetWidth / pixelsPerMs);

            if (msSpan < CWRC.toMillisec('minute'))
                return 'seconds';
            else if (msSpan < CWRC.toMillisec('hour'))
                return 'minutes';
            else if (msSpan < CWRC.toMillisec('day'))
                return 'hours';
            else if (msSpan < CWRC.toMillisec('month'))
                return 'days';
            else if (msSpan < CWRC.toMillisec('year'))
                return 'months';
            else if (msSpan < CWRC.toMillisec('decade'))
                return 'years';
            else if (msSpan < CWRC.toMillisec('century'))
                return 'decades';
            else if (msSpan < CWRC.toMillisec('year') * 1000)
                return 'centuries';
            else
                return 'millennia';
        });

        this.majorUnit = ko.pureComputed(function () {
            var msSpan = (self.getElement().offsetWidth / pixelsPerMs);

            if (msSpan < CWRC.toMillisec('minute'))
                return 'minutes';
            else if (msSpan < CWRC.toMillisec('hour'))
                return 'hours';
            else if (msSpan < CWRC.toMillisec('day'))
                return 'days';
            else if (msSpan < CWRC.toMillisec('month'))
                return 'months';
            else if (msSpan < CWRC.toMillisec('year'))
                return 'years';
            else if (msSpan < CWRC.toMillisec('decade'))
                return 'decades';
            else if (msSpan < CWRC.toMillisec('century'))
                return 'centuries';
            else
                return 'millennia';
        });

        this.step = function (unit) {
            var spanDate, dates, label;

            dates = [];
            spanDate = new Date(self.startStamp());

            self.floorDate(spanDate, unit);

            while (spanDate.getTime() <= self.endStamp()) {
                if (/days?/i.test(unit))
                    label = spanDate.getDate();
                else if (/months?/i.test(unit))
                // toLocalString options aren't supported in IE 9 & 10.
                    label = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][spanDate.getMonth()];
                else if (/decades?|centuries|century|millenium|millenia/i.test(unit))
                    label = spanDate.getFullYear() + 's';
                else
                    label = spanDate.getFullYear();

                dates.push({
                    label: label,
                    position: (spanDate.getTime() - self.startStamp()) * pixelsPerMs * scale() + 'px'
                });

                self.advance(spanDate, unit);
            }

            return dates;
        };

        this.getElement = function () {
            return document.getElementById('timeline-ruler');
        };

        this.advance = function (date, unit, amount) {
            amount = amount || 1;

            if (/days?/i.test(unit))
                date.setDate(date.getDate() + amount);
            else if (/months/i.test(unit))
                date.setMonth(date.getMonth() + amount);
            else if (/years/i.test(unit))
                date.setFullYear(date.getFullYear() + amount);
            else if (/decades/i.test(unit))
                date.setFullYear(date.getFullYear() + amount * 10);
            else if (/centuries/i.test(unit))
                date.setFullYear(date.getFullYear() + amount * 100);
            else
                date.setFullYear(date.getFullYear() + amount * 1000);
        };

        this.floorDate = function (date, unit) {
            var granularity, yearsBy;

            if (/months/i.test(unit))
                date.setMonth(date.getMonth(), 1);
            else {
                yearsBy = function (granularity, source) {
                    return Math.floor(source.getFullYear() / granularity) * granularity
                };

                if (/years/i.test(unit))
                    granularity = 1;
                else if (/decades/i.test(unit))
                    granularity = 10;
                else if (/centuries/i.test(unit))
                    granularity = 100;
                else
                    granularity = 1000;

                date.setFullYear(yearsBy(granularity, date), 0, 1);
            }

            // assumes that the minimum unit is day, so we can ignore everything lower.
            date.setHours(0, 0, 0);

            return date;
        }
    };
})();