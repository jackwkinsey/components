/*

XTable: an open source, JavaScript-based dynamic table for web applications
Based on the Table component from Exaptive

Ported by: Matt Coatney
Ported on: June 30, 2017

Copyright (C) 2017 Exaptive Inc.
The components in this repository are distributed under the terms of the GNU General Public License (GPL) v3.0. (https://www.gnu.org/licenses/gpl-3.0.en.html)


For a working example, see xtable_example.html.

Inputs:

div_id: the id of the div in which to place the table, e.g. test_table for 
    <div class="exaptive-table-component table-responsive-vertical shadow-z-1" id="test_table"></div>

title: a string that represents the title to use for the table, 
    this is put into an `h1` tag at the top of the table and has the CSS 
    class of `table-title`

data: a dictionary containing two elements:
    columns: an array of dictionaries representing column definition, including id and label (used for display).
    rows: an array of dictionaries, one per row of data (assumes every column is defined in the dictionary, even if the data is empty). Each row is a dictionary, with the keys being column IDs and the values being either numeric, text, boolean or empty/null

Options: a dictionary containing the following elements:
    style: One of striped, condensed, bordered, or hover. This controls the look and feel of the rows within the table.
    
    selection: A dictionary of settings related to selection
        allow: If true, a user can make a selection on the table
        multiSelect: If true, a user may select multiple rows on the table
        indicator: If true, an inidcator for the row's selection state will be shown (checkbox if multiselect, radio button if single)
    
    edit: If true, a user may edit cell values and the resulting data will be output
    
    drag: If true, a user may sort entities by dragging the rows
    
    remove: If true, a user may delete an entity from the table
    
    columnClick: If true, a user may click on column titles to sort rows by that column.
    
    columnOrder: A list of column ids to set the sort order. If not set the order will be the order of the incoming data.
    
    rowOrder: A column id along with a order[desc, asc]. eg. id desc. If not set the order will be the order of the incoming data.

*/

var XTable = function (divId, title, data, options) {
    this.divId = '';
    this.title = '';
    this.rows = [];
    this.columns = [];
    this.options = {};
    this.colMap = {};
    this.colIDLookup = {};
    this.colType = {};
    this.sortColumn = '';
    this.sortAscending = true;

    this.divId = divId;
    this.title = title;
    this.options = options;
    this.rowOrder = options.rowOrder ? options.rowOrder.split(' ') : [];
    this.updateData(data);

    this.render();
};


XTable.prototype.setData = function (data) {
    let columns = data.columns;
    let rows = data.rows;
    this.colMap = {};
    this.colType = {};
    this.columns = [];
    this.colIDLookup = {};

    columns.forEach(c => {
        this.colMap[c.id] = c;
        this.colIDLookup[c.label] = c.id;
        this.columns.push(c.id);

        const value = rows[0][c.id];
        switch (typeof value) {
            case 'number':
                this.colType[c.id] = 'numeric';
                break;
            case 'object':
                this.colType[c.id] = value instanceof Date ? 'date' : 'text';
                break;
            case 'string':
            default:
                this.colType[c.id] = 'text';
        }
    }, this);

    this.rows = rows;
};

XTable.prototype.getRows = function () {
    return this.rows;
};

XTable.prototype.getSerialized = function () {
    return this.rows.map(row => this.serializeRow(row));
};

XTable.prototype.serializeRow = function (row) {
    const obj = {};
    this.getColumnNames().forEach(col => {
        obj[col] = row[col];
    });
    return obj;
};

XTable.prototype.getRow = function (id) {
    return this.serializeRow(this.rows.find(row => row.id === id));
};

XTable.prototype.removeRow = function (id) {
    this.rows = this.rows.filter(d => d.id !== id);
    return this;
};

XTable.prototype.moveRow = function (from, to) {
    this.rows.splice(to, 0, this.rows.splice(from, 1)[0]);
    return this;
};

XTable.prototype.sortBy = function (column, ascending) {
    if (this.sortColumn === column && arguments.length < 2) {
        this.sortAscending = !this.sortAscending;
    } else {
        this.sortAscending = ascending;
    }
    this.sortColumn = column;
    var sortType = this.getColumnType(column);

    this.rows = this.rows.sort((ra, rb) => {
        const a = ra[this.sortColumn];
        const b = rb[this.sortColumn];
        let sa;
        let sb;
        if (sortType === 'numeric' || sortType === 'date') {
            sa = a;
            sb = b;
        } else {
            sa = a.toString().toUpperCase();
            sb = b.toString().toUpperCase();
        }
        const sign = this.sortAscending ? 1 : -1;
        if (sa < sb) return -sign;
        else if (sa > sb) return sign;
        return 0;
    });
    return this;
};

XTable.prototype.getColumnNames = function () {
    return this.columns.map(c => this.colMap[c].label);
};

XTable.prototype.getColumns = function () {
    return this.columns.map(c => ({
        id: c,
        label: this.colMap[c].label
    }));
};

XTable.prototype.getColumnType = function (id) {
    return this.colType[id];
};

XTable.prototype.setColumnOrder = function (order) {
    this.columns = this.columns.sort((a, b) => {
        const ia = order.indexOf(this.colMap[a].id);
        const ib = order.indexOf(this.colMap[b].id);
        const oa = ia < 0 ? 100000000 : ia;
        const ob = ib < 0 ? 100000000 : ib;
        return oa - ob;
    });
    return this;
};

XTable.prototype.updateCell = function (rowId, columnName, value) {
    var row = this.rows.find(d => d.id === rowId);
    row[columnName] = value;
};

XTable.prototype.updateOptions = function (newOptions) {
    this.options = newOptions;
    this.rowOrder = newOptions.rowOrder ? newOptions.rowOrder.split(' ') : [];

    this.render();
};

XTable.prototype.updateData = function (data) {
    this.setData(data);

    if (this.options.columnOrder && this.options.columnOrder.length > 0) {
        this.setColumnOrder(this.options.columnOrder);
    }

    if (this.options.rowOrder) {
        var rowOrder = this.options.rowOrder ? this.options.rowOrder.split(' ') : [];
        var columnName = this.rowOrder[0];
        var ascending = this.rowOrder[1] === 'asc';

        const col = this.getColumns().find(c => c.id === columnName);
        if (col) this.sortBy(col.id, ascending);
    }
    this.render();
};

XTable.prototype.render = function () {
    let divId = this.divId;
    let columns = this.getColumns();
    let rows = this.getRows();
    let titleHTML = '<h1 class="table-title">' + this.title + '</h1>';

    let headerHTML = '<thead><tr>';
    if (this.options.selection.indicator) {
        headerHTML += '<th></th>';
    }
    if (this.options.drag) {
        headerHTML += '<th></th>';
    }
    columns.forEach(c => {
        let className = 'sort-header';
        if (this.sortColumn === c.id && this.sortAscending) {
            className += ' sort-up sorted';
        } else if (this.sortColumn === c.id && !this.sortAscending) {
            className += ' sort-down sorted';
        }
        className += ' col-' + this.getColumnType(c.id);
        headerHTML += `<th class='${className}' data-id='${c.id}'>${c.label}</th>`;
    });
    if (this.options.remove) {
        headerHTML += '<th></th>';
    }

    headerHTML += '</tr></thead>';

    let tableHTML = `${titleHTML}<table class='table'>${headerHTML}<tbody>`;
    rows.forEach(entity => {
        tableHTML += `<tr data-id='${entity.id}'>`;

        if (this.options.selection.indicator) {
            tableHTML += `<td class='button-indicator button-cell'><i class='fa fa-${this.options.selection.multiSelect ? 'square-o' : 'circle-o'}'></i></td>`;
        }
        if (this.options.drag) {
            tableHTML += `<td class='button-drag button-cell'><i class='fa fa-bars'></i></td>`;
        }

        columns.forEach(c => {
            const value = entity[c.id];
            const colType = this.getColumnType(c.id)
            //const entry = colType === 'text' ? value : value.toString();
            const className = 'col-' + colType;

            let entry = '';
            
            switch (colType) {
                case 'text':
                    entry = value;
                    break;
                case 'date':
                    entry = value.toLocaleDateString();
                    break;
                case 'numeric':
                default:
                    entry = value.toString();
            }

            tableHTML += `<td class='${className}' data-title='${c.label}'>${entry}</td>`;
        });

        if (this.options.remove) {
            tableHTML += `<td class='button-remove button-cell'><i class='fa fa-trash'></i></td>`;
        }
        tableHTML += '</tr>';
    });
    tableHTML += '</tbody></table>';

    let div = document.getElementById(divId);
    div.innerHTML = tableHTML;


    this.elems = {
        table: div.querySelector('table'),
        header: div.querySelector('thead'),
        body: div.querySelector('tbody')
    };

    if (this.options.drag) {
        Sortable.create(this.elems.body, {
            handle: '.button-drag',
            animation: 150,
            onEnd: e => {
                this.moveRow(e.oldIndex, e.newIndex);
                //this.onChange();
            }
        });
    }

    this.elems.table.classList[this.options.style.includes('hover') ? 'add' : 'remove']('table-hover');
    this.elems.table.classList[this.options.style.includes('striped') ? 'add' : 'remove']('table-striped');
    this.elems.table.classList[this.options.style.includes('bordered') ? 'add' : 'remove']('table-bordered');
    this.elems.table.classList[this.options.style.includes('condensed') ? 'add' : 'remove']('table-condensed');

    this.elems.body.querySelectorAll('td:not(.button-cell)').forEach(cell => {
        cell.setAttribute('contenteditable', this.options.edit);
        cell.addEventListener('focus', () => {
            cell.setAttribute('data-org', cell.innerText);
        }, false);
        cell.addEventListener('blur', () => {
            if (cell.getAttribute('data-org') !== cell.innerText) {
                var rowId = cell.parentElement.getAttribute('data-id');

                cell.setAttribute('data-org', cell.innerText);

                var row = this.getRow(rowId);
                this.updateCell(rowId, cell.getAttribute('data-title'), cell.innerText);
                var updatedRow = this.getRow(rowId);

                /*
                api.output('edit', {
                  old: row,
                  new: updatedRow
                });
                */

                //this.onChange();
            }
        }, false);
    });

    this.elems.table.querySelectorAll('th').forEach(columnHeader => {
        columnHeader.addEventListener('click', e => {
            const id = e.target.getAttribute('data-id');
            if (!this.options.columnClick) return;

            this.sortBy(id);
            this.render();
        });
    });
    this.elems.body.querySelectorAll('tr').forEach(row => {
        row.addEventListener('mouseover', e => {
            this.setHighlighted([]);
            row.classList.add('highlighted');
            //api.output('mouseover', [e.currentTarget.getAttribute('data-id')]);
        });
        row.addEventListener('mouseout', e => {
            row.classList.remove('highlighted');
            //api.output('mouseout', [e.currentTarget.getAttribute('data-id')]);
        });
        row.addEventListener('click', e => {
            const clickRow = e.currentTarget;
            const clickCell = e.target;
            const rowId = e.currentTarget.getAttribute('data-id');

            if (clickCell.classList.contains('button-cell')) {
                if (clickCell.classList.contains('button-remove')) {
                    clickRow.parentElement.removeChild(clickRow);
                    this.removeRow(rowId);
                    //api.output('remove', [rowId]);
                    //this.onChange();
                    return;
                } else if (clickCell.classList.contains('button-indicator')) {
                    this.setSelected([rowId], this.options.selection.multiSelect);
                }
            } else {
                this.setSelected([rowId], this.options.selection.multiSelect);
            }

            //api.output('click', [rowId]);
        });
    });
};

XTable.prototype.setSelected = function (ids, append) {
    if (!this.options.selection.allow) return;

    const rows = this.elems.body.querySelectorAll('tr');

    rows.forEach(row => {
        const toSelect = ids.indexOf(row.getAttribute('data-id')) > -1;
        const isSelected = row.classList.contains('selected');

        if (append) {
            if (isSelected && toSelect) {
                row.classList.remove('selected');
            } else {
                row.classList[(isSelected || toSelect) ? 'add' : 'remove']('selected');
            }
        } else {
            row.classList[toSelect ? 'add' : 'remove']('selected');
        }
    });

    const output = [];
    rows.forEach(r => {
        if (r.classList.contains('selected')) output.push(r.getAttribute('data-id'));
    });

    //if (!dataflowEvent) api.output('selected', output);

    // update indicator
    if (this.options.selection.indicator) {
        rows.forEach(r => {
            const indicatorIcon = r.querySelector('.button-indicator i');
            let classes = 'fa fa-';
            if (this.options.selection.multiSelect) classes += r.classList.contains('selected') ? 'check-square-o' : 'square-o';
            else classes += r.classList.contains('selected') ? 'circle' : 'circle-o';
            indicatorIcon.className = classes;
        });
    }
};
XTable.prototype.setHighlighted = function (ids) {
    const rows = this.elems.body.querySelectorAll('tr');

    rows.forEach(row => {
        row.classList[ids.indexOf(row.getAttribute('data-id')) > -1 ? 'add' : 'remove']('highlighted');
    });
};