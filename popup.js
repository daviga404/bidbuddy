var BidBuddy = {

    /**
     * Empty settings variable to load settings into.
     *
     * @public
     */
    settings: {},

    /**
     * The current active page. Can be changed via input.
     * 
     * @private
     */
    _page: 1,

    /**
     * The default settings if they are not present.
     *
     * @private
     */
    _defaults: {
        query: 'Macbook',
        exclude: ['case', 'sleeve', 'upgrade', 'SSD', 'screen', 'harddrive', 'LCD', 'keyboard', 'cover', 'adapter', 'superdrive', 'backpack', 'sticker', 'VGA', 'lock', 'mouse']
    },

    /**
     * Loads settings from localStorage.
     *
     * @public
     */
    loadSettings: function() {

        // Add defaults
        for (var key in this._defaults) {
            if (!localStorage.hasOwnProperty(key)) {
                localStorage[key] = this._defaults[key];
            }
        }

        // Load in settings
        this.settings = localStorage;

        //==DEBUG
        //for(var key in this.settings){ console.log('settings['+key+'] = '+this.settings[key]); }
        //==/DEBUG
    },

    /**
     * Generates a search query URL based on the settings.
     *
     * @param string page The page number to query.
     * @return The URL for the search query.
     * @private
     */
    _getQueryURL: function(page, key) {

        var exclusions = '-' + this.settings.exclude.split(',').join(' -'), // Clones the array with .slice(0), as to not convert it to a string.
            query      = this.settings.query + ' ' + exclusions,
            url        = 'http://svcs.ebay.com/services/search/FindingService/v1?' +
                         'operation-name=findItemsByKeywords&'                     + // Search for items by keyboard.
                         'global-id=EBAY-GB&'                                      + // Use the British version of eBay
                         'service-version=1.0.0&'                                  + // Default service version.
                         'security-appname=' + key + '&'                           + // The application key.
                         'response-data-format=JSON&'                              + // The data format to return results in.
                         'rest-payload&'                                           + // Use REST for request
                         'itemFilter.name=ListingType&'                            + // The item filter name
                         'itemFilter.value=Auction&'                               + // Filter by Auction only
                         'keywords=' + encodeURIComponent(query);                    // Search query

        return url;

    },

    /**
     * Convenience function to pad numbers to two digits.
     * 
     * @param int number The number to pad.
     * @return A padded string.
     * @private
     */
    _pad: function(number) {
        return parseInt(number) > 9 ? number : '0' + number;
    },

    /**
     * Parses timestamps to a suitable format for the table.
     *
     * @param int timestamp The Javascript Unix timestamp
     * @return A string with an HTML-formatted date.
     * @private
     */
    _parseTime: function(timestamp) {

        var date           = new Date(timestamp),
            now            = new Date(),
            dayMeasure     = 24 * 60 * 60 * 1000, // H * M * S * MS
            hourMeasure    = 60 * 60 * 1000,      // M * S * MS
            minuteMeasure  = 60 * 1000,           // S * MS
            secondMeasure  = 1000,                // MS
            remainingDays  = Math.round(Math.abs((date.getTime() - now.getTime()) / (dayMeasure))),
            remainingHours = Math.round(Math.abs((date.getTime() - now.getTime()) / (hourMeasure))),
            remainingMins  = Math.round(Math.abs((date.getTime() - now.getTime()) / (minuteMeasure))),
            remainingSecs  = Math.round(Math.abs((date.getTime() - now.getTime()) / (secondMeasure))),
            remaining      = '';

        if (remainingDays > 1) {
            remaining = remainingDays + 'd';
        } else if (remainingHours > 1) {
            remaining = remainingHours + 'h';
        } else if (remainingMins > 0) {
            remaining = remainingMins + 'm';
        } else {
            remaining = remainingSecs + 's';
        }

        var month = 'January';
        switch (date.getMonth()) {
            case 0:  month = 'January';   break;
            case 1:  month = 'February';  break;
            case 2:  month = 'March';     break;
            case 3:  month = 'April';     break;
            case 4:  month = 'May';       break;
            case 5:  month = 'June';      break;
            case 6:  month = 'July';      break;
            case 7:  month = 'August';    break;
            case 8:  month = 'September'; break;
            case 9:  month = 'October';   break;
            case 10: month = 'November';  break;
            case 11: month = 'December';  break;
        }

        var day     = this._pad(date.getDate()),
            hours   = this._pad(date.getHours()),
            minutes = this._pad(date.getMinutes())

        return remaining + ' remaining' +
               '<span class="date">' +
               month +' ' + day + ', ' + hours + ':' + minutes +
               '</span>';

    },

    /**
     * Loads the search results into the DOM. This is the callback for "getSearchResults".
     *
     * @param {XMLHttpRequestProgressEvent} e The event parameter passed by the XMLHttpRequest.
     * @private
     */
    _loadSearchResults: function(e) {

        var response  = e.target.response,
            json      = JSON.parse(response),
            fragment  = document.createDocumentFragment(),
            container = document.getElementById('results');

        if (json.findItemsByKeywordsResponse[0].hasOwnProperty('errorMessage') &&
            json.findItemsByKeywordsResponse[0].errorMessage.length > 0) {
            container.innerHTML = '<tr><th>Error</th></tr>' +
                                  '<tr><td>Uh oh! An error occurred. Please put this error message in a bug report:</td></tr>' + 
                                  '<tr><td>' + json.findItemsByKeywordsResponse[0].errorMessage[0].error[0].message[0] + '</td></tr>';
            return;
        }

        var resultsCount = json.findItemsByKeywordsResponse[0].searchResult[0]['@count'],
            results      = json.findItemsByKeywordsResponse[0].searchResult[0].item;
        
        if (resultsCount < 1) {
            container.innerHTML = '<tr><th>No results found</th></tr>';
            return;
        }

        //==DEBUG
        //console.log(results);
        //==/DEBUG

        container.innerHTML = ''; // We don't want any other items now, do we?

        for (var i = 0; i < results.length; i++) {

            //==DEBUG
            //console.log(results[i]);
            //==/DEBUG

            var itemJSON = results[i],
                item     = {
                    name:  itemJSON.title[0],
                    href:  itemJSON.viewItemURL[0],
                    image: itemJSON.galleryURL[0],
                    time:  itemJSON.listingInfo[0].endTime[0],
                    price: itemJSON.sellingStatus[0].currentPrice[0].__value__ + '<small>Postage: £' + itemJSON.shippingInfo[0].shippingServiceCost[0].__value__ + '</small>'
                },
                row      = document.createElement('tr'),
                imageDiv = document.createElement('td'), // Note: div = divider in table.
                titleDiv = document.createElement('td'),
                priceDiv = document.createElement('td'),
                timeDiv  = document.createElement('td'),
                itemLink = document.createElement('a'),
                image    = document.createElement('img');

            // <td> Tags
            imageDiv.setAttribute('class', 'thumbnail');
            titleDiv.setAttribute('class', 'title');
            priceDiv.setAttribute('class', 'price');
            timeDiv.setAttribute('class', 'time');

            // <td> Without Children
            priceDiv.innerHTML = '£' + item.price;
            timeDiv.innerHTML    = this._parseTime(item.time);

            // <td> With Children
            image.src            = item.image;
            itemLink.href        = item.href;
            itemLink.textContent = item.name;

            // Append <td> Children
            titleDiv.appendChild(itemLink);
            imageDiv.appendChild(image);

            // Append <td>s to <tr>
            row.appendChild(imageDiv);
            row.appendChild(titleDiv);
            row.appendChild(priceDiv);
            row.appendChild(timeDiv);

            fragment.appendChild(row);

        }

        container.appendChild(fragment);

    },

    /**
     * Gets eBay page content from a search query built on the settings.
     * 
     * @public
     */
    getSearchResults: function(page) {

        var keyRequest = new XMLHttpRequest();
        keyRequest.onload = function(e) {

            var request = new XMLHttpRequest();
            request.onload = this._loadSearchResults.bind(this);
            request.open('GET', this._getQueryURL(page, e.target.response), true);
            request.send(null);
            this._page = page;

        }.bind(this);
        keyRequest.open('GET', chrome.extension.getURL('/appkey.dat'), true);
        keyRequest.send(null);

    },

    /**
     * Registers all button event handlers related to BidBuddy.
     * 
     * @public
     */
    initButtons: function() {

        var elements = document.querySelectorAll('a,button'),
            buttons  = [];

        for (var i = 0; i < elements.length; i++) {
            var element = elements[i];
            if (element.hasAttribute('data-action') && element.getAttribute('data-action').substring(0, 3) === 'lb:') {
                var actionAttribute = element.getAttribute('data-action'),
                    actionString    = actionAttribute.substring(3),
                    action          = actionString.indexOf(':') > 0                                      ?
                                      actionString.substring(0, actionString.indexOf(':')).toLowerCase() :
                                      '',
                    actionProperty  = actionString.substring(actionString.lastIndexOf(':') + 1).toLowerCase();

                //==DEBUG
                //console.log('(iteration) ' + actionAttribute + ', ' + actionString + ', ' + action + ', ' + actionProperty);
                //==/DEBUG

                if (action === 'save' && actionProperty.length > 0) {

                    if (document.getElementById(actionProperty) && this.settings.hasOwnProperty(actionProperty))
                        document.getElementById(actionProperty).value = this.settings[actionProperty];

                    element.addEventListener('click', function(e) {
                        //==DEBUG
                        //('(click) ' + this.actionAttribute + ', ' + this.actionString + ', ' + this.action + ', ' + this.actionProperty);
                        //==/DEBUG
                        // Save the setting
                        localStorage[this.actionProperty] = document.getElementById(this.actionProperty)       ?
                                                            document.getElementById(this.actionProperty).value :
                                                            this._defaults.hasOwnProperty(this.actionProperty) ?
                                                            this._defaults[this.actionProperty]                :
                                                            null;
                        this.self.loadSettings();

                        // Change the text to "Saved!" for 2 seconds.
                        var oldContent = e.target.innerHTML;
                        e.target.textContent = 'Saved!';
                        setTimeout(function() {
                            e.target.innerHTML = oldContent;
                        }, 2000);

                        // Reload search results
                        this.self.getSearchResults(1);
                    }.bind({ // Prevent using the last iteration
                        self: this,
                        actionProperty: actionProperty,
                        actionString: actionString,
                        action: action,
                        actionAttribute: actionAttribute
                    }));

                } else if (action === 'page' && actionProperty.length > 0) {

                    element.addEventListener('click', function(e) {
                        this.self.getSearchResults(this.actionProperty == 'prev'                   ?
                                                  (this.self._page < 1 ?  0 : this.self._page - 1) :
                                                  (this.self._page + 1));
                        document.getElementById('page').textContent = this.self._page;
                    }.bind({ // Prevent using the last iteration
                        self: this,
                        actionProperty: actionProperty,
                        actionString: actionString,
                        action: action,
                        actionAttribute: actionAttribute
                    }));

                }
            }
        }

    }

};

BidBuddy.loadSettings();
BidBuddy.initButtons();
BidBuddy.getSearchResults(1);