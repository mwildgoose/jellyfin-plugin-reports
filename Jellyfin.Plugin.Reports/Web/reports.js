const defaultSortBy = 'SortName';

const query = {
    StartIndex: 0,
    Limit: 100,
    IncludeItemTypes: 'Movie',
    HasQueryLimit: true,
    GroupBy: 'None',
    ReportView: 'ReportData',
    DisplayType: 'Screen'
};

function getTable(result, initial_state) {
    const setAttributes = (el, attr) => Object.entries(attr).forEach(([k, v]) => el.setAttribute(k, v));
    //Report table
    const table = document.createElement('table');
    table.classList.add('tblLibraryReport', 'stripedTable', 'ui-responsive', 'table-stroke', 'detailTable');
    setAttributes(table, {'id': 'tblReport', 'data-role': 'table', 'data-mode': 'reflow', 'style': 'display:table;'});

    //Report headers
    const thead = document.createElement('thead');
    result.Headers.forEach((header) => {
        const th = document.createElement('th');
        th.classList.add('detailTableHeaderCell');
        th.setAttribute('data-priority', 'persist');

        if (header.ShowHeaderLabel) {
            const heading = header.Name || '\xA0';
            if (header.SortField) {
                const button = document.createElement('button');
                button.classList.add('lnkColumnSort', 'button-link', 'emby-button');
                setAttributes(button, {'data-sortfield': header.SortField, 'style': 'text-decoration: underline;'});
                button.textContent = heading;
                th.appendChild(button);
                if (header.SortField === query.SortBy) {
                    const span = document.createElement('span');
                    span.style = 'font-weight: bold; margin-left: 5px; vertical-align: top;';
                    span.textContent = query.SortOrder === 'Descending' ? '\u2193' : '\u2191';
                    th.appendChild(span);
                }
            } else {
                th.textContent = heading;
            }
        }
        thead.appendChild(th);
    });
    table.appendChild(thead);

    //Report body
    const tbody = document.createElement('tbody');
    if (!result.IsGrouped) {
        result.Rows.forEach((row) => tbody.appendChild(getRow(result.Headers, row)));
    } else {
        let row_count = 0;
        let current_state = 'table-row';
        let current_pointer = '\u25BC';
        if (initial_state) {
            current_state = 'none';
            current_pointer = '\u25B6';
        }
        result.Groups.forEach((group) => {
            const grpHeadRow = document.createElement('tr');
            grpHeadRow.style = 'background-color: rgb(51, 51, 51); color: rgba(255,255,255,.87);';
            const grpHeading = document.createElement('th');
            grpHeading.classList.add('detailTableHeaderCell');
            setAttributes(grpHeading, {'scope': 'rowgroup', 'colspan': result.Headers.length});
            const a = document.createElement('a');
            a.classList.add('lnkShowHideRows');
            setAttributes(a, {'data-group_id': row_count, 'data-group_state': current_state, 'style': 'cursor: pointer;'});
            a.textContent = current_pointer;
            grpHeading.appendChild(a);
            grpHeading.appendChild(document.createElement('span')).textContent = ` ${group.Name || '\xA0'} : ${group.Rows.length}`;
            grpHeadRow.appendChild(grpHeading);
            tbody.appendChild(grpHeadRow);

            group.Rows.forEach((row) => tbody.appendChild(getRow(result.Headers, row, row_count, current_state)));

            const grpFootRow = document.createElement('tr');
            const grpFooter = document.createElement('th');
            grpFooter.classList.add('detailTableHeaderCell', `row_id_${row_count}`);
            setAttributes(grpFooter, {'scope': 'rowgroup', 'colspan': result.Headers.length, 'style': `display:${current_state};`});
            grpFooter.textContent = '\xA0';
            grpFootRow.appendChild(grpFooter);
            tbody.appendChild(grpFootRow);

            row_count++;
        });
    }
    table.appendChild(tbody);

    return table;
}

function getRow(rHeaders, rRow, row_count, current_state) {
    const tr = document.createElement('tr');
    tr.classList.add('detailTableBodyRow', 'detailTableBodyRow-shaded', `row_id_${row_count}`);
    tr.style = `display:${current_state};`;

    rRow.Columns.forEach((rItem, j) => tr.appendChild(getItem(rHeaders[j], rRow, rItem)));
    
    return tr;
}

function getItem(rHeader, rRow, rItem) {
    const td = document.createElement('td');
    td.classList.add('detailTableBodyCell');
    const id = rItem.Id || rRow.Id;
    const serverId = rRow.ServerId || rItem.ServerId || ApiClient.serverId();

    switch (rHeader.ItemViewType) {
        case 'None':
            td.textContent = rItem.Name;
            break;
        case 'Detail':
            td.appendChild(createLinkElement(Emby.Page.getRouteUrl({ Id: id, ServerId: serverId }), true, rItem.Name));
            break;
        case 'Edit':
            td.appendChild(createLinkElement(`edititemmetadata.html?id=${rRow.Id}`, false, rItem.Name));
            break;
        case 'List':
            td.appendChild(createLinkElement(`itemlist.html?serverId=${rItem.ServerId}&id=${rRow.Id}`, false, rItem.Name));
            break;
        case 'ItemByNameDetails':
            td.appendChild(createLinkElement(Emby.Page.getRouteUrl({ Id: id, ServerId: serverId }), false, rItem.Name));
            break
        case 'EmbeddedImage':
            if (rRow.HasEmbeddedImage) {
                td.appendChild(createIconElement('check'));
            }
            break;
        case 'SubtitleImage':
            if (rRow.HasSubtitles) {
                td.appendChild(createIconElement('check'));
            }
            break;
        case 'TrailersImage':
            if (rRow.HasLocalTrailer) {
                td.appendChild(createIconElement('check'));
            }
            break;
        case 'SpecialsImage':
            if (rRow.HasSpecials) {
                td.appendChild(createIconElement('photo', 'Missing primary image.', 'color:red;'));
            }
            break;
        case 'LockDataImage':
            if (rRow.HasLockData) {
                td.appendChild(createIconElement('lock', 'Metadata is locked.'));
            }
            break;
        case 'TagsPrimaryImage':
            if (!rRow.HasImageTagsPrimary) {
                td.appendChild(createLinkIconElement(`edititemmetadata.html?id=${rRow.Id}`, 'photo', 'Missing primary image.', 'color:red;'));
            }
            break;
        case 'TagsBackdropImage':
            if (!rRow.HasImageTagsBackdrop) {
                if (rRow.RowType !== 'Episode' && rRow.RowType !== 'Season' && rRow.MediaType !== 'Audio' && rRow.RowType !== 'TvChannel' && rRow.RowType !== 'MusicAlbum') {
                    td.appendChild(createLinkIconElement(`edititemmetadata.html?id=${rRow.Id}`, 'photo', 'Missing backdrop image.', 'color:orange;'));
                }
            }
            break;
        case 'TagsLogoImage':
            if (!rRow.HasImageTagsLogo) {
                if (rRow.RowType === 'Movie' || rRow.RowType === 'Trailer' || rRow.RowType === 'Series' || rRow.RowType === 'MusicArtist' || rRow.RowType === 'BoxSet') {
                    td.appendChild(createLinkIconElement(`edititemmetadata.html?id=${rRow.Id}`, 'photo', 'Missing logo image.'));
                }
            }
            break;
        case 'UserPrimaryImage':
            if (rRow.UserId) {
                const userImage = ApiClient.getUserImageUrl(rRow.UserId, {
                    height: 24,
                    type: 'Primary'

                });
                if (userImage) {
                    const img = createElement('img');
                    img.src = userImage;
                    td.appendChild(img);
                }
            }
            break;
        case 'StatusImage':
            if (rRow.HasLockData) {
                td.appendChild(createIconElement('lock', 'Metadata is locked.'));
            }

            if (!rRow.HasLocalTrailer && rRow.RowType === 'Movie') {
                td.appendChild(createIconElement('videocam', 'Missing local trailer.'));
            }

            if (!rRow.HasImageTagsPrimary) {
                td.appendChild(createIconElement('photo', 'Missing primary image.', 'color:red;'));
            }

            if (!rRow.HasImageTagsBackdrop) {
                if (rRow.RowType !== 'Episode' && rRow.RowType !== 'Season' && rRow.MediaType !== 'Audio' && rRow.RowType !== 'TvChannel' && rRow.RowType !== 'MusicAlbum') {
                    td.appendChild(createIconElement('photo', 'Missing backdrop image.', 'color:orange;'));
                }
            }

            if (!rRow.HasImageTagsLogo) {
                if (rRow.RowType === 'Movie' || rRow.RowType === 'Trailer' || rRow.RowType === 'Series' || rRow.RowType === 'MusicArtist' || rRow.RowType === 'BoxSet') {
                    td.appendChild(createIconElement('photo', 'Missing logo image.'));
                }
            }
            break;
        default:
            td.textContent = rItem.Name;
    }
    return td;
}

function createLinkElement(href, isEmbyLink, content) {
    const a = document.createElement('a');
    a.setAttribute('is', isEmbyLink ? 'emby-linkbutton' : 'emby-button');
    a.href = href;
    a.textContent = content;
    return a;
}

function createIconElement(icon, title, style) {
    const i = document.createElement('i');
    i.classList.add('material-icons', icon);
    if (title)
        i.title = title;
    if (style)
        i.style = style;
    return i;
}

function createLinkIconElement(href, icon, title, style) {
    const a = createLinkElement(href, false, '');
    a.appendChild(createIconElement(icon, title, style));
    return a;
}

function ExportReport() {
    query.UserId = Dashboard.getCurrentUserId();
    query.HasQueryLimit = false;
    query.api_key = ApiClient.accessToken();
    const url = ApiClient.getUrl('Reports/Items/Download', query);

    if (url) {
        window.location.href = url;
    }
}

function loadGroupByFilters(page) {
    query.UserId = Dashboard.getCurrentUserId();
    let url = '';

    url = ApiClient.getUrl('Reports/Headers', query);
    ApiClient.getJSON(url).then(function (result) {
        let selected = 'None';

        const selectReportGroup = page.querySelector('#selectReportGroup');
        for (const elem of selectReportGroup.querySelectorAll('option')) {
            const parent = elem.parentNode;
            parent.removeChild(elem);
        }
        selectReportGroup.insertAdjacentHTML('beforeend', '<option value="None">None</option>');
        result.map(function (header) {
            if ((header.DisplayType === 'Screen' || header.DisplayType === 'ScreenExport') && header.CanGroup) {
                if (header.FieldName.length > 0) {
                    const option = '<option value="' + header.FieldName + '">' + header.Name + '</option>';
                    selectReportGroup.insertAdjacentHTML('beforeend', option);
                    if (query.GroupBy === header.FieldName)
                        selected = header.FieldName;
                }
            }
        });
        page.querySelector('#selectPageSize').value = selected;
    });
}

function getQueryPagingHtml(page, totalRecordCount) {
    const startIndex = query.StartIndex;
    const limit = query.Limit;
    const recordsEnd = Math.min(startIndex + limit, totalRecordCount);
    const showControls = limit < totalRecordCount;

    const pagingDiv = document.createElement('div');
    if (query.Limit == -1) {
        pagingDiv.textContent = `Total : ${result.TotalRecordCount}`;
    } else if (showControls) {
        const pagingTxt = pagingDiv.appendChild(document.createElement('span'));
        pagingTxt.style = 'vertical-align:middle;';
        pagingTxt.textContent = `${totalRecordCount ? startIndex + 1 : 0}-${recordsEnd} of ${totalRecordCount}`;
        const nextPrevButtons = pagingDiv.appendChild(document.createElement('div'));
        nextPrevButtons.style = 'display:inline-block;';

        const prevButton = nextPrevButtons.appendChild(document.createElement('button'));
        prevButton.addEventListener('click', () => {
            query.StartIndex -= query.Limit;
            reloadItems(page);
        });
        prevButton.classList.add('paper-icon-button-light');
        if (startIndex) prevButton.classList.add('disabled');
        prevButton.appendChild(createIconElement('arrow_back'));

        const nextButton = nextPrevButtons.appendChild(document.createElement('button'));
        nextButton.addEventListener('click', () => {
            query.StartIndex += query.Limit;
            reloadItems(page);
        });
        nextButton.classList.add('paper-icon-button-light');
        if (startIndex + limit >= totalRecordCount) nextButton.classList.add('disabled');
        nextButton.appendChild(createIconElement('arrow_forward'));
    }

    return pagingDiv;
}

function renderItems(page, result) {
    window.scrollTo(0, 0);

    if (query.ReportView === 'ReportData') {
        page.querySelector('#selectIncludeItemTypesBox').classList.remove('hide');
        page.querySelector('#tabFilter').classList.remove('hide');
    } else {
        page.querySelector('#selectIncludeItemTypesBox').classList.add('hide');
        page.querySelector('#tabFilterBox').classList.add('hide');
        page.querySelector('#tabFilter').classList.add('hide');
    }

    if (query.ReportView === 'ReportData' || query.ReportView === 'ReportActivities') {
        page.querySelector('div.paging').replaceChildren(getQueryPagingHtml(page, result.TotalRecordCount));

        const initial_state = page.querySelector('#chkStartCollapsed').checked;
        const reporContainer = page.querySelector('.reporContainer');
        reporContainer.replaceChildren(getTable(result, initial_state));

        for (const elem of page.querySelectorAll('.lnkShowHideRows')) {
            elem.addEventListener('click', function () {
                const row_id = this.getAttribute('data-group_id');
                const row_id_index = 'row_id_' + row_id;
                const row_group_state = this.getAttribute('data-group_state');
                //alert(this.getAttribute("data-group_state"));
                if (row_group_state == 'table-row') {
                    this.setAttribute('data-group_state', 'none');
                    for (const elems of page.querySelectorAll('.' + row_id_index)) {
                        elems.style.display = 'none';
                    }
                    this.innerHTML = '&#x25B6;';
                } else {
                    this.setAttribute('data-group_state', 'table-row');
                    for (const elems of page.querySelectorAll('.' + row_id_index)) {
                        elems.style.display = 'table-row';
                    }
                    this.innerHTML = '&#x25BC;';
                }
            });
        }

        for (const elem of page.querySelectorAll('.lnkColumnSort')) {
            elem.addEventListener('click', function () {
                const order = this.getAttribute('data-sortfield');

                if (query.SortBy === order) {
                    if (query.SortOrder === 'Descending') {
                        query.SortOrder = 'Ascending';
                        query.SortBy = defaultSortBy;
                    } else {
                        query.SortOrder = 'Descending';
                        query.SortBy = order;
                    }
                } else {
                    query.SortOrder = 'Ascending';
                    query.SortBy = order;
                }

                query.StartIndex = 0;

                reloadItems(page);
            });
        }
    }

    page.querySelector('#GroupStatus').classList.add('hide');
    page.querySelector('#GroupAirDays').classList.add('hide');
    page.querySelector('#GroupEpisodes').classList.add('hide');

    switch (query.IncludeItemTypes) {
        case 'Series':
        case 'Season':
            page.querySelector('#GroupStatus').classList.remove('hide');
            page.querySelector('#GroupAirDays').classList.remove('hide');
            break;
        case 'Episode':
            page.querySelector('#GroupStatus').classList.remove('hide');
            page.querySelector('#GroupAirDays').classList.remove('hide');
            page.querySelector('#GroupEpisodes').classList.remove('hide');
            break;
    }
}

function reloadItems(page) {
    Loading.show();

    query.UserId = Dashboard.getCurrentUserId();
    let url = '';

    switch (query.ReportView) {
        case 'ReportData':
            query.HasQueryLimit = true;
            url = ApiClient.getUrl('Reports/Items', query);
            break;
        case 'ReportActivities':
            query.HasQueryLimit = true;
            url = ApiClient.getUrl('Reports/Activities', query);
            break;
    }

    ApiClient.getJSON(url).then(function (result) {
        updateFilterControls(page);
        renderItems(page, result);
    });

    Loading.hide();
}

function updateFilterControls(context) {
    for (const elem of context.querySelectorAll('.chkStandardFilter')) {
        const filters = ',' + (query.Filters || '');
        const filterName = elem.getAttribute('data-filter');

        elem.checked = filters.indexOf(',' + filterName) != -1;
    }

    for (const elem of context.querySelectorAll('.chkVideoTypeFilter')) {
        const filters = ',' + (query.VideoTypes || '');
        const filterName = elem.getAttribute('data-filter');

        elem.checked = filters.indexOf(',' + filterName) != -1;
    }
    for (const elem of context.querySelectorAll('.chkStatus')) {
        const filters = ',' + (query.SeriesStatus || '');
        const filterName = elem.getAttribute('data-filter');

        elem.checked = filters.indexOf(',' + filterName) != -1;
    }
    for (const elem of context.querySelectorAll('.chkAirDays')) {
        const filters = ',' + (query.AirDays || '');
        const filterName = elem.getAttribute('data-filter');

        elem.checked = filters.indexOf(',' + filterName) != -1;
    }

    context.querySelector('#chk3D').checked = query.Is3D == true;
    context.querySelector('#chkHD').checked = query.IsHD == true;
    context.querySelector('#chkSD').checked = query.IsHD == false;

    context.querySelector('#chkSubtitle').checked = query.HasSubtitles == true;
    context.querySelector('#chkTrailer').checked = query.HasTrailer == true;
    context.querySelector('#chkMissingTrailer').checked = query.HasTrailer == false;
    context.querySelector('#chkSpecialFeature').checked = query.HasSpecialFeature == true;
    context.querySelector('#chkThemeSong').checked = query.HasThemeSong == true;
    context.querySelector('#chkThemeVideo').checked = query.HasThemeVideo == true;

    context.querySelector('#selectPageSize').value = query.Limit;

    //Management
    context.querySelector('#chkMissingRating').checked = query.HasOfficialRating == false;
    context.querySelector('#chkMissingOverview').checked = query.HasOverview == false;
    context.querySelector('#chkIsLocked').checked = query.IsLocked == true;
    context.querySelector('#chkMissingImdbId').checked = query.HasImdbId == false;
    context.querySelector('#chkMissingTmdbId').checked = query.HasTmdbId == false;
    context.querySelector('#chkMissingTvdbId').checked = query.HasTvdbId == false;

    //Episodes
    context.querySelector('#chkSpecialEpisode').checked = query.ParentIndexNumber == 0;
    context.querySelector('#chkMissingEpisode').checked = query.IsMissing == true;
    context.querySelector('#chkFutureEpisode').checked = query.IsUnaired == true;

    context.querySelector('#selectIncludeItemTypes').value = query.IncludeItemTypes;

    // isfavorite
    context.querySelector('#chkIsFavorite').checked = query.IsFavorite == true;
    context.querySelector('#chkIsNotFavorite').checked = query.IsNotFavorite == true;
}

let filtersLoaded;
function reloadFiltersIfNeeded(page) {
    if (!filtersLoaded) {
        filtersLoaded = true;

        QueryReportFilters.loadFilters(page, Dashboard.getCurrentUserId(), query, function () {
            reloadItems(page);
        });

        QueryReportColumns.loadColumns(page, Dashboard.getCurrentUserId(), query, function () {
            reloadItems(page);
        });
    }
}

function renderOptions(context, selector, cssClass, items) {
    const elem = context.querySelector(selector);

    if (items.length) {
        elem.classList.remove('hide');
    } else {
        elem.classList.add('hide');
    }

    let html = '';

    //  style="margin: -.2em -.8em;"
    html += '<div data-role="controlgroup">';

    let index = 0;
    const idPrefix = 'chk' + selector.substring(1);

    html += items.map(function (filter) {
        let itemHtml = '';

        const id = idPrefix + index;
        let label = filter;
        let value = filter;
        let checked = false;
        if (filter.FieldName) {
            label = filter.Name;
            value = filter.FieldName;
            checked = filter.Visible;
        }

        itemHtml += '<input id="' + id + '" type="checkbox" data-filter="' + value + '" class="' + cssClass + '"';
        if (checked)
            itemHtml += ' checked="checked" ';
        itemHtml += '/> ';
        itemHtml += '<label for="' + id + '">' + label + '</label>';
        itemHtml += '<br/>';

        index++;

        return itemHtml;
    }).join('');

    html += '</div>';

    elem.querySelector('.filterOptions').innerHTML = html;
}

function renderFilters(context, result) {
    if (result.Tags) {
        result.Tags.length = Math.min(result.Tags.length, 50);
    }

    renderOptions(context, '.genreFilters', 'chkGenreFilter', result.Genres);
    renderOptions(context, '.officialRatingFilters', 'chkOfficialRatingFilter', result.OfficialRatings);
    renderOptions(context, '.tagFilters', 'chkTagFilter', result.Tags);
    renderOptions(context, '.yearFilters', 'chkYearFilter', result.Years);
}

function renderColumnss(context, result) {
    if (result.Tags) {
        result.Tags.length = Math.min(result.Tags.length, 50);
    }

    renderOptions(context, '.reportsColumns', 'chkReportColumns', result);
}

function onFiltersLoaded(context, query, reloadItemsFn) {
    for (const elem of context.querySelectorAll('.chkGenreFilter')) {
        elem.addEventListener('change', function () {
            const filterName = elem.getAttribute('data-filter');
            let filters = query.Genres || '';
            const delimiter = '|';

            filters = (delimiter + filters).replace(delimiter + filterName, '').substring(1);

            if (elem.checked) {
                filters = filters ? (filters + delimiter + filterName) : filterName;
            }

            query.StartIndex = 0;
            query.Genres = filters;

            reloadItemsFn();
        });
    }

    for (const elem of context.querySelectorAll('.chkTagFilter')) {
        elem.addEventListener('change', function () {
            const filterName = elem.getAttribute('data-filter');
            let filters = query.Tags || '';
            const delimiter = '|';

            filters = (delimiter + filters).replace(delimiter + filterName, '').substring(1);

            if (elem.checked) {
                filters = filters ? (filters + delimiter + filterName) : filterName;
            }

            query.StartIndex = 0;
            query.Tags = filters;

            reloadItemsFn();
        });
    }

    for (const elem of context.querySelectorAll('.chkYearFilter')) {
        elem.addEventListener('change', function () {
            const filterName = elem.getAttribute('data-filter');
            let filters = query.Years || '';
            const delimiter = ',';

            filters = (delimiter + filters).replace(delimiter + filterName, '').substring(1);

            if (elem.checked) {
                filters = filters ? (filters + delimiter + filterName) : filterName;
            }

            query.StartIndex = 0;
            query.Years = filters;

            reloadItemsFn();
        });
    }

    for (const elem of context.querySelectorAll('.chkOfficialRatingFilter')) {
        elem.addEventListener('change', function () {
            const filterName = elem.getAttribute('data-filter');
            let filters = query.OfficialRatings || '';
            const delimiter = '|';

            filters = (delimiter + filters).replace(delimiter + filterName, '').substring(1);

            if (elem.checked) {
                filters = filters ? (filters + delimiter + filterName) : filterName;
            }

            query.StartIndex = 0;
            query.OfficialRatings = filters;

            reloadItemsFn();
        });
    }
}

function onColumnsLoaded(context, query, reloadItemsFn) {
    for (const elem of context.querySelectorAll('.chkReportColumns')) {
        elem.addEventListener('change', function () {
            const filterName = elem.getAttribute('data-filter');
            let filters = query.ReportColumns || '';
            const delimiter = '|';

            filters = (delimiter + filters).replace(delimiter + filterName, '').substring(1);

            if (elem.checked) {
                filters = filters ? (filters + delimiter + filterName) : filterName;
            }

            query.StartIndex = 0;
            query.ReportColumns = filters;

            reloadItemsFn();
        });
    }
}

function loadFilters(context, userId, itemQuery, reloadItemsFn) {
    return ApiClient.getJSON(ApiClient.getUrl('Items/Filters', {

        UserId: userId,
        ParentId: itemQuery.ParentId,
        IncludeItemTypes: itemQuery.IncludeItemTypes,
        ReportView: itemQuery.ReportView

    })).then(function (result) {
        renderFilters(context, result);

        onFiltersLoaded(context, itemQuery, reloadItemsFn);
    });
}

function loadColumns(context, userId, itemQuery, reloadItemsFn) {
    return ApiClient.getJSON(ApiClient.getUrl('Reports/Headers', {

        UserId: userId,
        IncludeItemTypes: itemQuery.IncludeItemTypes,
        ReportView: itemQuery.ReportView

    })).then(function (result) {
        renderColumnss(context, result);
        let filters = '';
        const delimiter = '|';
        result.map(function (item) {
            if ((item.DisplayType === 'Screen' || item.DisplayType === 'ScreenExport'))
                filters = filters ? (filters + delimiter + item.FieldName) : item.FieldName;
        });
        if (!itemQuery.ReportColumns)
            itemQuery.ReportColumns = filters;
        onColumnsLoaded(context, itemQuery, reloadItemsFn);
    });
}

function onPageShow(page, query) {
    query.Genres = null;
    query.Years = null;
    query.OfficialRatings = null;
    query.Tags = null;
}

function onPageReportColumnsShow(page, query) {
    query.ReportColumns = null;
}

window.QueryReportFilters = {
    loadFilters: loadFilters,
    onPageShow: onPageShow
};

window.QueryReportColumns = {
    loadColumns: loadColumns,
    onPageShow: onPageReportColumnsShow
};

export default function (view) {
    view.querySelector('#selectIncludeItemTypes').addEventListener('change', function () {
        query.StartIndex = 0;
        query.ReportView = view.querySelector('#selectViewType').value;
        query.IncludeItemTypes = this.value;
        query.SortOrder = 'Ascending';
        query.ReportColumns = null;
        filtersLoaded = false;
        loadGroupByFilters(view);
        reloadFiltersIfNeeded(view);
        reloadItems(view);
    });

    view.querySelector('#selectViewType').addEventListener('change', function () {
        query.StartIndex = 0;
        query.ReportView = this.value;
        query.IncludeItemTypes = view.querySelector('#selectIncludeItemTypes').value;
        query.SortOrder = 'Ascending';
        filtersLoaded = false;
        query.ReportColumns = null;
        loadGroupByFilters(view);
        reloadFiltersIfNeeded(view);
        reloadItems(view);
    });

    view.querySelector('#selectReportGroup').addEventListener('change', function () {
        query.GroupBy = this.value;
        query.StartIndex = 0;
        reloadItems(view);
    });

    view.querySelector('#chkStartCollapsed').addEventListener('change', function () {
        reloadItems(view);
    });

    view.querySelector('#btnReportExportCsv').addEventListener('click', function (e) {
        query.ExportType = 'CSV';
        ExportReport(view, e);
    });

    view.querySelector('#btnReportExportExcel').addEventListener('click', function (e) {
        query.ExportType = 'Excel';
        ExportReport(view, e);
    });

    view.querySelector('#btnResetReportColumns').addEventListener('click', function () {
        query.ReportColumns = null;
        query.StartIndex = 0;
        filtersLoaded = false;
        reloadFiltersIfNeeded(view);
        reloadItems(view);
    });

    view.querySelector('#selectPageSize').addEventListener('change', function () {
        query.Limit = parseInt(this.value);
        query.StartIndex = 0;
        reloadItems(view);
    });

    const chkIsFavorite = view.querySelector('#chkIsFavorite');
    chkIsFavorite.addEventListener('change', () => {
        if (chkIsFavorite.checked) {
            query.IsFavorite = true;
        } else {
            query.IsFavorite = false;
        }
        reloadItems(view);
    });
    const chkIsNotFavorite = view.querySelector('#chkIsNotFavorite');
    chkIsNotFavorite.addEventListener('change', () => {
        if (chkIsNotFavorite.checked) {
            query.IsNotFavorite = true;
        } else {
            query.IsNotFavorite = false;
        }
        reloadItems(view);
    });
    for (const elem of view.querySelectorAll('.chkStandardFilter')) {
        elem.addEventListener('change', function () {
            const filterName = elem.getAttribute('data-filter');
            let filters = query.Filters || '';

            filters = (',' + filters).replace(',' + filterName, '').substring(1);

            if (elem.checked) {
                filters = filters ? (filters + ',' + filterName) : filterName;
            }

            query.StartIndex = 0;
            query.Filters = filters;

            reloadItems(view);
        });
    }

    for (const elem of view.querySelectorAll('.chkVideoTypeFilter')) {
        elem.addEventListener('change', function () {
            const filterName = elem.getAttribute('data-filter');
            let filters = query.VideoTypes || '';

            filters = (',' + filters).replace(',' + filterName, '').substring(1);

            if (elem.checked) {
                filters = filters ? (filters + ',' + filterName) : filterName;
            }

            query.StartIndex = 0;
            query.VideoTypes = filters;

            reloadItems(view);
        });
    }

    const chk3D = view.querySelector('#chk3D');
    chk3D.addEventListener('change', () => {
        query.StartIndex = 0;
        query.Is3D = chk3D.checked ? true : null;

        reloadItems(view);
    });

    const chkHD = view.querySelector('#chkHD');
    chkHD.addEventListener('change', () => {
        query.StartIndex = 0;
        query.IsHD = chkHD.checked ? true : null;

        reloadItems(view);
    });

    const chkSD = view.querySelector('#chkSD');
    chkSD.addEventListener('change', () => {
        query.StartIndex = 0;
        query.IsHD = chkSD.checked ? false : null;

        reloadItems(view);
    });

    const chkSubtitle = view.querySelector('#chkSubtitle');
    chkSubtitle.addEventListener('change', () => {
        query.StartIndex = 0;
        query.HasSubtitles = chkSubtitle.checked ? true : null;

        reloadItems(view);
    });

    const chkTrailer = view.querySelector('#chkTrailer');
    chkTrailer.addEventListener('change', () => {
        query.StartIndex = 0;
        query.HasTrailer = chkTrailer.checked ? true : null;

        reloadItems(view);
    });

    const chkMissingTrailer = view.querySelector('#chkMissingTrailer');
    chkMissingTrailer.addEventListener('change', () => {
        query.StartIndex = 0;
        query.HasTrailer = chkMissingTrailer.checked ? false : null;

        reloadItems(view);
    });

    const chkSpecialFeature = view.querySelector('#chkSpecialFeature');
    chkSpecialFeature.addEventListener('change', () => {
        query.StartIndex = 0;
        query.HasSpecialFeature = chkSpecialFeature.checked ? true : null;

        reloadItems(view);
    });

    const chkThemeSong = view.querySelector('#chkThemeSong');
    chkThemeSong.addEventListener('change', () => {
        query.StartIndex = 0;
        query.HasThemeSong = chkThemeSong.checked ? true : null;

        reloadItems(view);
    });

    const chkThemeVideo = view.querySelector('#chkThemeVideo');
    chkThemeVideo.addEventListener('change', () => {
        query.StartIndex = 0;
        query.HasThemeVideo = chkThemeVideo.checked ? true : null;

        reloadItems(view);
    });

    //Management
    const chkIsLocked = view.querySelector('#chkIsLocked');
    chkIsLocked.addEventListener('change', () => {
        query.StartIndex = 0;
        query.IsLocked = chkIsLocked.checked ? true : null;

        reloadItems(view);
    });

    const chkMissingOverview = view.querySelector('#chkMissingOverview');
    chkMissingOverview.addEventListener('change', () => {
        query.StartIndex = 0;
        query.HasOverview = chkMissingOverview.checked ? false : null;

        reloadItems(view);
    });

    const chkMissingRating = view.querySelector('#chkMissingRating');
    chkMissingRating.addEventListener('change', () => {
        query.StartIndex = 0;
        query.HasOfficialRating = chkMissingRating.checked ? false : null;

        reloadItems(view);
    });

    const chkMissingImdbId = view.querySelector('#chkMissingImdbId');
    chkMissingImdbId.addEventListener('change', () => {
        query.StartIndex = 0;
        query.HasImdbId = chkMissingImdbId.checked ? false : null;

        reloadItems(view);
    });

    const chkMissingTmdbId = view.querySelector('#chkMissingTmdbId');
    chkMissingTmdbId.addEventListener('change', () => {
        query.StartIndex = 0;
        query.HasTmdbId = chkMissingTmdbId.checked ? false : null;

        reloadItems(view);
    });

    const chkMissingTvdbId = view.querySelector('#chkMissingTvdbId');
    chkMissingTvdbId.addEventListener('change', () => {
        query.StartIndex = 0;
        query.HasTvdbId = chkMissingTvdbId.checked ? false : null;

        reloadItems(view);
    });

    //Episodes
    const chkMissingEpisode = view.querySelector('#chkMissingEpisode');
    chkMissingEpisode.addEventListener('change', () => {
        query.StartIndex = 0;
        query.IsMissing = chkMissingEpisode.checked ? true : false;

        reloadItems(view);
    });

    const chkFutureEpisode = view.querySelector('#chkFutureEpisode');
    chkFutureEpisode.addEventListener('change', () => {
        query.StartIndex = 0;

        if (chkFutureEpisode.checked) {
            query.IsUnaired = true;
            query.IsVirtualUnaired = null;
        } else {
            query.IsUnaired = null;
            query.IsVirtualUnaired = false;
        }

        reloadItems(view);
    });

    const chkSpecialEpisode = view.querySelector('#chkSpecialEpisode');
    chkSpecialEpisode.addEventListener('change', () => {
        query.ParentIndexNumber = chkSpecialEpisode.checked ? 0 : null;

        reloadItems(view);
    });

    for (const elem of view.querySelectorAll('.chkAirDays')) {
        elem.addEventListener('change', function () {
            const filterName = elem.getAttribute('data-filter');
            let filters = query.AirDays || '';

            filters = (',' + filters).replace(',' + filterName, '').substring(1);

            if (elem.checked) {
                filters = filters ? (filters + ',' + filterName) : filterName;
            }

            query.AirDays = filters;
            query.StartIndex = 0;
            reloadItems(view);
        });
    }

    for (const elem of view.querySelectorAll('.chkStatus')) {
        elem.addEventListener('change', function () {
            const filterName = elem.getAttribute('data-filter');
            let filters = query.SeriesStatus || '';

            filters = (',' + filters).replace(',' + filterName, '').substring(1);

            if (elem.checked) {
                filters = filters ? (filters + ',' + filterName) : filterName;
            }

            query.SeriesStatus = filters;
            query.StartIndex = 0;
            reloadItems(view);
        });
    }

    view.querySelector('.btnPanelOpen').addEventListener('click', function () {
        const viewPanel = view.querySelector('.viewPanel');
        viewPanel.classList.add('ui-panel-open');
        viewPanel.classList.remove('ui-panel-closed');
        reloadFiltersIfNeeded(view);
    });

    view.querySelector('.btnPanelClose').addEventListener('click', () => {
        const viewPanel = view.querySelector('.viewPanel');
        viewPanel.classList.add('ui-panel-closed');
        viewPanel.classList.remove('ui-panel-open');
    });

    const openTabs = ({ target }) => {
        const { dataset: { tab = '' }} = target;
        view.querySelectorAll('.viewTabButton').forEach(t =>
            t.classList.remove('ui-btn-active')
        );
        target.classList.add('ui-btn-active');
        view.querySelectorAll('.viewTab').forEach(t =>
            t.classList.add('hide')
        );
        view.querySelector(`.${tab}`).classList.remove('hide');
    };

    view.querySelectorAll('.viewTabButton').forEach(tab => {
        tab.addEventListener('click', openTabs);
    });

    view.addEventListener('viewshow', function () {
        query.UserId = Dashboard.getCurrentUserId();
        const page = this;
        query.SortOrder = 'Ascending';

        QueryReportFilters.onPageShow(page, query);
        QueryReportColumns.onPageShow(page, query);
        const selectIncludeItemTypes = page.querySelector('#selectIncludeItemTypes');
        selectIncludeItemTypes.value = query.IncludeItemTypes;
        selectIncludeItemTypes.dispatchEvent(new Event('change'));

        updateFilterControls(page);

        filtersLoaded = false;
        updateFilterControls(this);
    });
}
