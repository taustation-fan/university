"use strict";

function course_slug(name) {
    var slug = name.toLowerCase().replace( /[^a-z0-9]+/g, '-' );
    return 'course-' + slug;
}

var courses_done = {};

function process_education_input() {
    var candidates = $('#education-input').val().split(/[\n\t+]/);
    var courses = [];
    candidates.forEach(function(c) {
        var trimmed = c.trim();
        if (!trimmed.match(/^\d\d\d\.\d\d\/\s*GCT/)){
            courses.push(trimmed)
        }
    });
    var found = 0;
    var not_found = [];
    courses.forEach(function(c) {
        var slug = course_slug(c);
        var $dom = $('#' + slug).find('.done');
        if ($dom.length) {
            found ++;
            $dom.html('✔');
            courses_done[slug] = true;
        }
        else {
            not_found.push(c);
            console.log("Not found '" + c + "' with slug '" + slug + "'");
        }
    });
    var total = Object.keys(document.univ_courses).length;
    var msg = 'You finished ' + found + ' courses out of ' + total + '.';
    if (not_found) {
        msg += "<br>You also finished the following courses that I know nothing about: " + not_found.join(', ');

    }
    $('#education-status').html(msg);
    $('#univ').trigger('updateAll');
}

function get_filter(mode) {
    if (mode === 'all') {
        return '';
    }
    else if (mode == 'open') {
        return '!✔';
    }
    else if (mode == 'done') {
        return '✔';
    }
}


function topo_sorted_slugs() {
    if (document.univ_courses_sorted) {
        return document.univ_courses_sorted;
    }

    // build a list of all edges in the graph
    var edges = []
    for (var course_idx in document.univ_courses) {
        var course = document.univ_courses[course_idx];
        for (var p_idx in course.prerequisites) {
            edges.push([course.slug, course.prerequisites[p_idx].slug]);
        }
    }
    // tsort from file assets/toposort.js
    var sorted = tsort(edges);
    sorted.reverse();
    document.univ_courses_sorted = sorted;
    return sorted;
}

function recursive_prerequisties(course) {
    // find all recursive prerequisites, in any order:
    var all_prereqs = [];
    var seen = {};
    function visit(prereqs) {
        for (var idx in prereqs) {
            var p = document.univ_courses[prereqs[idx].slug];
            if (p && !seen[p.slug]) {
                all_prereqs.push(p);
                visit(p.prerequisites);
                seen[p.slug] = 1;
            }
        }
    }
    visit(course.prerequisites);

    // now join it with the topological sorted list of all
    // course slugs to get the ordering sensible:
    var r_obj = {}
    all_prereqs.forEach(function(r) {
        r_obj[r.slug] = r;
    });
    var sorted_prereqs = [];
    topo_sorted_slugs().forEach(function (r) {
        if (r_obj.hasOwnProperty(r)) {
            sorted_prereqs.push(r_obj[r]);
        }
    });

    return sorted_prereqs;
}

function fill_ul($ul, prereq) {
    $ul.html('');
    for (var idx in prereq) {
        var $a = $('<a>', {
            text: (prereq[idx].name || prereq[idx].course),
            href: '#',
            data: {'slug': prereq[idx].slug},
            click: show_details,
        });
        var $li = $('<li>').html($a);
        $ul.append($li)
    }
}

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
        nl:  'Nouveau Limoges (Sol)',
        moi: 'Moissan (Alpha Centauri)',
        sob: 'Spirit of Botswana (Alpha Centauri)',
    };

    var avail = [];
    var keys = Object.keys(universities);
    keys.sort();
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

    if (course.prerequisites) {
        $cont.find('#course_details_prerequisites_cont').show();
        var rp = recursive_prerequisties(course);
        fill_ul($('#course_details_all_prerequisites'), rp);
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
    $('#univ').tablesorter({
        theme: 'blue',
        headers: {
            2: {sorter: 'digit', filter: false},
            4: {sorter: 'digit'},
            5: {sorter: 'digit'}
        },
        widgets: ["zebra", "filter"],
        ignoreCase: true,
        widgetOptions: {
            filter_columnFilters : false,
            filter_columnAnyMatch: true,
            filter_external: '.search',
            filter_filteredRow : 'filtered',
            filter_liveSearch : true,
            filter_matchType : { 'input': 'match', 'select': 'match' },
            filter_placeholder: { search : 'Search...' },
            filter_saveFilters : true,
            filter_functions: {
                10: {
                    all: function() { return true },
                    done: get_filter('done'),
                    open: get_filter('open'),
                }
            }
            
        }
    });

    $('.checksearch, #donedeps').on('change', function() {
        var filter = [];
        $('.checksearch').each(function() {
            var $s = $(this);
            if ($s.prop('checked')) {
                filter[$s.data('col')] = '✔';
            }
        });
        var doneness = $('#donedeps').prop('value');
        filter[10] = get_filter(doneness);
        $('#univ').trigger('search', [ filter ]);

    });

    $('.course-link').click(show_details);
    $('#education-input-button').click(process_education_input)
    $(document).keyup(function(e) {
        if (e.keyCode == 27) {
            // ESCape key pressed => hide popup
            $('#course_details').hide();
        }
    });
});
