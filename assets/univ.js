"use strict";

function course_slug(name) {
    var slug = name.toLowerCase().replace( /[^a-z0-9]+/g, '-' );
    return 'course-' + slug;
}

var courses_done = {};

function process_education_input() {
    var candidates = $('#education-input').val().split(/[\n\t+]/);
    var course_in_progress = null;
    var slug_course_in_progress = null;
    var courses = [];
    var enrolled_regex = /Enrolled in (.+?)\./;
    var course_credits = 0;
    candidates.forEach(function(c) {
        var trimmed = c.trim();
        var match = enrolled_regex.exec(trimmed);
        if (match) {
            course_in_progress = match[1];
        } else if (trimmed != '' && !trimmed.match(/^\d\d\d\.\d\d\/\s*GCT/)){
            courses.push(trimmed);
        }
    });
    if (course_in_progress) {
        slug_course_in_progress = course_slug(course_in_progress);
        var course = document.univ_courses[slug_course_in_progress];
        if (course) {
            course.status = 'In progress';
            course_credits += course.cost || 0;
        }
    }
    var found = 0;
    var not_found = [];
    // these are headings that we do not want to list as unknown courses
    var blacklist = {
        Course: 1,
        Completed: 1
    };
    courses.forEach(function(c) {
        var slug = course_slug(c);
        var course = document.univ_courses[slug];
        if (course) {
            course.status = 'Done';
            course_credits += course.cost || 0;
        }
        var $dom = $('#' + slug).find('.done');
        if ($dom.length) {
            found ++;
            $dom.html('✔');
            courses_done[slug] = true;
        }
        else if (! blacklist[c]) {
            not_found.push(c);
        }
    });

    // Mark eligible courses (all prerequisites done)
    $('#univ tbody tr').each(function(idx) {
        var $tr = $(this);
        var $dom = $tr.find('.done');
        if ($dom.html() === '✔') {
            return; // Already taken, not eligible
        }

        var prereqs = $tr.find('.prereqs .course-link');
        var prereqs_met = true;
        prereqs.each(function(idx) {
            var slug = $(this).attr('data-slug');
            if (!(slug in courses_done)
                    && !(slug === slug_course_in_progress)) {
                prereqs_met = false;
            }
        });
        if (prereqs_met) {
            var $dom = $tr.find('.eligible');
            if ($dom.length) {
                $dom.html('✔');
            }
        }
    });

    var total = Object.keys(document.univ_courses).length;
    var msg = 'You finished ' + found + ' courses out of ' + total + '.';
    if (not_found.length) {
        msg += "<br>You also finished the following courses that I know nothing about: " + not_found.join(', ');
    }
    if (course_credits) {
        msg += "<br>You have spent at least " + course_credits + " credits on your education.";
    }
    $('#education-status').html(msg);
    $('#univ').trigger('updateAll');
}

// Clear user input area
function process_education_clear() {
    $('#education-input').val('');
    $('#education-timestamp').text('');
    $('#education-status').text('');
    return;
}

// Persist completed courses in localStorage
function process_education_store() {
    let losto_courses_name = 'edu_courses_completed';
    let losto_when_name    = 'edu_courses_stored_when';
    let pasted_by_user     = $('#education-input').val().trim();
    let when_pasted        = new Date().toISOString();
    if ( pasted_by_user.length ) {
        localStorage.setItem( losto_courses_name, pasted_by_user );
        localStorage.setItem( losto_when_name, when_pasted );
    }
    return;
}

// Read completed courses from localStorage
function process_education_recall() {
    let losto_courses_name = 'edu_courses_completed';
    let losto_when_name    = 'edu_courses_stored_when';
    let recalled_courses   = localStorage.getItem( losto_courses_name );
    if (   recalled_courses === null
        || recalled_courses === undefined
        ||  (
                typeof(recalled_courses) === 'string'
                && recalled_courses.trim().length === 0
            )
    ) {
        return;
    }
    $('#education-input').val( localStorage.getItem( losto_courses_name ) );
    $('#education-timestamp').html( 'Recalled from ' + localStorage.getItem( losto_when_name ) + '<br>' );
    process_education_input();
    return;
}

// Clear completed courses from localStorage
function process_education_forget() {
    let losto_courses_name = 'edu_courses_completed';
    let losto_when_name    = 'edu_courses_stored_when';
    localStorage.removeItem( losto_courses_name );
    localStorage.removeItem( losto_when_name );
    process_education_clear();
    return;
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
    else if (mode === 'eligible') {
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
        var title = (prereq[idx].name || prereq[idx].course);
        var status = prereq[idx].status;
        if (status) {
            title += ' [' + status + ']';
        }
        var $a = $('<a>', {
            text: title,
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
    $cont.find('#course_details_description').text(course.description || '');
    $cont.find('#course_details_measurement').text(course.measurement || '');

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
        widgets: ["zebra", "filter", "stickyHeaders"],
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
        if (doneness === 'eligible') {
            filter[11] = get_filter(doneness);
        } else {
            filter[10] = get_filter(doneness);
        }
        $('#univ').trigger('search', [ filter ]);

    });

    $('.course-link').click(show_details);
    $('#education-input-button').click(process_education_input);
    $('#education-clear-button').click(process_education_clear);
    $('#education-store-button').click(process_education_store);
    $('#education-recall-button').click(process_education_recall);
    $('#education-forget-button').click(process_education_forget);
    process_education_recall();
    $(document).keyup(function(e) {
        if (e.keyCode == 27) {
            // ESCape key pressed => hide popup
            $('#course_details').hide();
        }
    });
});
