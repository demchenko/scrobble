(function ScrobbleApp() {
    "use strict";

    var publ = this,
        priv = {
            selectors: {
                body:       document.body,
                app:        '#app',
                section:    '.played',
                playedItem: '.played__item',
                alert:      '.alert'
            },
            settings: {
                zoneId: 'U291bmRab25lLCwxano5YXYzcjd5OC9Mb2NhdGlvbiwsMWptZjV1aTBrNWMvQWNjb3VudCwsMW5kbWR6bmF5Z3cv',
                cookieName: 'favourites',
                favourites: []
            }
        };

    priv.init = function() {
        if (!$(priv.settings.app)) return;

        const faveCookie = priv.getCookie(priv.cookieName);
        if (faveCookie) {
            priv.settings.favourites = faveCookie.split(',') || [];
        }

        priv.setupEventListeners();
    };

    priv.setupEventListeners = function() {
        $(window).on('load', priv.loadHistory);
        $(priv.selectors.body).on('mouseup keyup', priv.selectors.playedItem, priv.toggleFavourite);
    };

    /**
     * Load History from API
     */
    priv.loadHistory = function() {
        const api = new ScrobbleApi(priv.settings.zoneId);
        $.when(api.fetchHistory()).done(scrobbles => {
            $.when(priv.createItem(scrobbles)).then(function(){
                //done
            });
        });
    };

    /**
     * Create each article and append it to the container
     *
     * @param data
     */
    priv.createItem = function(data) {
        const $article = $('.template').clone();
        var   $tmp     = $('<div />');

        $article.removeClass('template');
        $('.template').detach();

        $.each(data, function(i, item) {
            if (priv.isInFavourites(item.id)) {
                $article.addClass('favourite');
            } else {
                $article.removeClass('favourite');
            }
            $article.attr('tabindex', data.length - i).attr('data-item-id', item.id);
            $article.find('.played__title').text(item.song_name);
            $article.find('.played__artists').text(item.artists.map(artist => artist.name).join(', '));
            $article.find('.played__cover').attr('src', item.image_url);
            $article.find('.played__time').text(priv.timeSince(ScrobbleApi.playDate(item))).parent().attr('datetime', ScrobbleApi.playDate(item).toISOString());

            $tmp.append($article);

            $(priv.selectors.section).prepend($tmp.html());
        });
    };

    /**
     * Toggle favourite state for item
     *
     * @param e
     */
    priv.toggleFavourite = function(e) {
        const itemId = $(this).data('item-id');

        if (e.which === 13 || e.type === 'mouseup') {
            $(this).toggleClass('favourite');

            if (priv.isInFavourites(itemId)) {
                priv.settings.favourites.splice(priv.settings.favourites.indexOf(itemId), 1);

                $(priv.selectors.alert).removeClass('success').addClass('error').text("Removed from favourites").fadeIn().delay(400).fadeOut();
            } else {
                priv.settings.favourites.push(itemId);

                $(priv.selectors.alert).removeClass('error').addClass('success').text("Added to favourites").fadeIn().delay(400).fadeOut();
            }

            priv.setCookie(priv.cookieName, priv.settings.favourites);
        }
    };

    /**
     * Check if the item is already in favourites
     *
     * @param itemId
     * @returns {boolean}
     */
    priv.isInFavourites = function(itemId) {
        if (priv.settings.favourites) {
            if (priv.settings.favourites.indexOf(itemId) != -1) {
                return true;
            }
        }
    };

    /**
     * Convert playedDate to something more relateable
     *
     * @param date
     * @returns {string}
     */
    priv.timeSince = function(date) {
        var seconds = Math.floor((new Date() - date) / 1000);
        var interval = Math.floor(seconds / 31536000);

        if (interval > 1) {
            return interval + " years ago";
        }
        interval = Math.floor(seconds / 2592000);
        if (interval > 1) {
            return interval + " months ago";
        }
        interval = Math.floor(seconds / 86400);
        if (interval > 1) {
            return interval + " days ago";
        }
        interval = Math.floor(seconds / 3600);
        if (interval > 1) {
            return interval + " hours ago";
        }
        interval = Math.floor(seconds / 60);
        if (interval > 1) {
            return interval + " minutes ago";
        }

        return Math.floor(seconds) + " seconds ago";
    };

    /**
     * Set the cookie
     *
     * @param key
     * @param value
     */
    priv.setCookie = function(key, value) {
        var expires = new Date();

        expires.setTime(expires.getTime() + (1 * 24 * 60 * 60 * 1000));
        document.cookie = key + '=' + value + ';expires=' + expires.toUTCString();
    };

    /**
     * Read the cookie
     *
     * @param key
     * @returns {null}
     */
    priv.getCookie = function(key) {
        var keyValue = document.cookie.match('(^|;) ?' + key + '=([^;]*)(;|$)');

        return keyValue ? keyValue[2] : null;
    };

    priv.init();

})();