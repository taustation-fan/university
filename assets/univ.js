
function show_details() {
    var slug   = $(this).data('slug');
    var course = document.univ_courses[slug];
    var $cont  = $('#course_details');
    $cont.find('#course_details_name').text(course.course);
    $cont.find('#course_details_level').text(course.level);
    $cont.find('#course_details_duration').text(course.duration);
    $cont.find('#course_details_cost').text(course.cost);

    var universities = {
        tau: 'Tau Station (Sol)',
        nl: 'Nouveau Limoges (Sol)',
        moi: 'Moissan (Alpha Centauri)',
        sob: 'Spirit of Botswana (Alpha Centauri)',
    };
    console.log(universities);

    var avail = [];
    keys = Object.keys(universities);
    keys.sort();
    console.log(keys);
    for (var idx in keys) {
        if (course[keys[idx]]) {
            avail.push(universities[keys[idx]]);
        }
    }
    $cont.find('#course_details_universities').text(avail.join(', '));

    $('.course_details_close').click(function() {
        $cont.hide();
        return false;
    });
    
    $cont.show();
    return false;
}

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
    $('.course-link').click(show_details);
});
