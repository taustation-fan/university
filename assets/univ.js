
$(document).ready(function() {
    $('#univ').dynatable({
        table: {
            defaultColumnIdStyle: 'dashed',
        },
        features: {
            paginate: false
        },
        dataset: {
            perPageDefault: 200,
        }
    });
});
