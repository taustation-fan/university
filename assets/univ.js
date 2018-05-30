"use strict";

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
    var keys = Object.keys(universities);
    keys.sort();
    console.log(keys);
    for (var idx in keys) {
        if (course[keys[idx]]) {
            avail.push(universities[keys[idx]]);
        }
    }
    $cont.find('#course_details_universities').text(avail.join(', '));

    function debug($x) {
        console.log($x.wrap('<div>').parent().html());
        $x.unwrap();
    }

    var prereq = course.prerequisites;
    if (prereq) {
        $cont.find('#course_details_prerequisites_cont').show();
        var $ul = $('#course_details_prerequisites');
        $ul.html('');
        console.log($ul.length);
        for (var idx in prereq) {
            var $a = $('<a>', {
                text: prereq[idx].name,
                href: '#',
                data: {'slug': prereq[idx].slug},
                click: show_details,
            });
            debug($a);
            var $li = $('<li>').html($a);
            debug($li);
            $ul.append($li)
        }
        debug($ul);
    }
    else {
        $cont.find('#course_details_prerequisites_cont').hide();
    }

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
            sortTypes: {
                'level': 'number',
                'duration': 'number',
                'cost': 'number'
            }
        }
    });
    $('.course-link').click(show_details);
});
