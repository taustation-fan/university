
$(document).ready(function() {

    $.get('assets/univ-data.json', function(d) { 
        rows = d.filter(function(r) { return !r['coming_soon'] });
        console.log('populating table...');
        $('#univ').dynatable({
            table: {
                defaultColumnIdStyle: 'dashed',
            },
            features: {
                paginate: false
            },
            dataset: {
                records: rows,
                perPageDefault: 200,
            }
        });
    });

});
