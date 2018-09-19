"use strict";

window.edutau = {}; // Private namespace
edutau.enrolled_prefix = 'Enrolled in ';
edutau.global_course_states = {
    1: 'Not Done',
    2: 'In Progress',
    3: 'Done',
};

// Teach Storage to handle Objects
Storage.prototype.setObject = function(key, value) {
    this.setItem(key, JSON.stringify(value));
};

Storage.prototype.getObject = function(key) {
    var value = this.getItem(key);
    return value && JSON.parse(value);
};


function course_slug(name) {
    var slug = name.toLowerCase().replace( /[^a-z0-9]+/g, '-' );
    return 'course-' + slug;
}

function Course(name, state) {
    this.states = edutau.global_course_states;
    this.name = name;
    this.current_state = 1;
    this.next_state = function(cs) {
        let state_now = cs.current_state + 1;
        if ( state_now > Math.max( ... Object.keys(this.states).map( x => parseInt(x) ) ) ) {
            state_now = 1;
        }
        cs.current_state = state_now;
    };
    this.get_state = function(cs) {
        let my_state = cs.current_state;
        return my_state;
    };
    this.get_state_value = function(cs) {
        let my_state = this.states[ cs.current_state ];
        return my_state;
    };
}

function reduce_to_courses() {
    let ray = $('#education-input').val().split(/[\n\t]+/);
    const EDU = 'EDUCATION';
    const CLO = 'CLONES';
    if ( ray.includes(EDU) ) {
        let where = ray.indexOf(EDU);
        ray.splice( 0, where + 1 );
    }
    if ( ray.includes(CLO) ) {
        let where = ray.indexOf(CLO);
        ray.splice( where );
    }
    ray = ray
        .filter( line => !line.match( /^\d\d\d\.\d\d\/\s*GCT/     ) )
        .filter( line => !line.match( /^(?:Course|Completed)\s*$/ ) )
        .filter( line => !line.match( /^You are not enrolled /    ) )
        .map( line => line.trim() )
        .filter( line => !line.match( /^$/ ) )
        ;
    $('#education-input').val(ray.join('\n'));
    return ray;
}

function courses_to_objects() {
    let ray = $('#education-input').val().split(/[\n\t]+/);
    if ( ! ray[0].length ) {
        return;
    }
    edutau.all_courses = []; // Accessible from everywhere in the script
    const enrolled_regex = /Enrolled in (.+?)\./;
    var course_in_progress = null;
    ray.forEach(function(c) {
        var the_course = new Course;
        console.log(the_course);
        var match_enrolled = enrolled_regex.exec(c);
        if (match_enrolled) {
            // Currently active course
            course_in_progress = match_enrolled[1];
            the_course.current_state = 2; // in progress
            the_course.name = course_in_progress;
        } else if ( document.univ_courses[ course_slug(c) ] ) {
            the_course.current_state = 3; // done
            the_course.name = c;
        } else {
            the_course.current_state = 0; // unknown
            the_course.name = c;
        }
        the_course.slug = course_slug( the_course.name );
        edutau.all_courses.push( the_course );
    });
    return;
}

function lite_courses() {
    let lite = {}, course;
    if ( ! edutau.all_courses ) {
        return;
    }
    for ( course of edutau.all_courses ) {
        lite[ course.name ] = course.current_state;
    }
    console.log(lite);
    return lite;
}

var courses_done = {};

function process_education_input() {
    reduce_to_courses();
    courses_to_objects();
    if ( ! edutau.all_courses ) {
        return;
    }
    var course_in_progress = null; // look for course with state "in progress"
    var slug_course_in_progress = null; // turn its name into slug
    var courses = []; // all courses with state "done"
    if (course_in_progress) {
        slug_course_in_progress = course_slug(course_in_progress);
        var course_row = document.univ_courses[slug_course_in_progress];
        if (course_row) {
            course_row.status = 'In progress';
        }
    }
    var found = 0;
    var not_found = [];
    courses.forEach(function(c) {
        var slug = course_slug(c);
        var course_row = document.univ_courses[slug];
        if (course_row) {
            course_row.status = 'Done';
        }
        var $dom = $('#' + slug).find('.done');
        if ($dom.length) {
            found ++;
            $dom.html('✔');
            courses_done[slug] = true;
        }
        else {
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
    if (not_found) {
        msg += "<br>You also finished the following courses that I know nothing about: " + not_found.join(', ');

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
    const losto_courses_name = 'edu_courses_completed';
    const losto_when_name    = 'edu_courses_stored_when';
    let pasted_by_user       = lite_courses();
    let when_stored          = new Date().toISOString();
    if (   pasted_by_user === null
        || pasted_by_user === undefined
    ) {
        return;
    }
    if ( Object.keys(pasted_by_user).length ) {
        localStorage.setObject( losto_courses_name, pasted_by_user );
        localStorage.setItem( losto_when_name, when_stored );
    }
    return;
}

// Read completed courses from localStorage
function process_education_recall() {
    const losto_courses_name = 'edu_courses_completed';
    const losto_when_name    = 'edu_courses_stored_when';
    let recalled_courses     = localStorage.getObject( losto_courses_name );
    console.log(recalled_courses);
    if (   recalled_courses === null
    ) {
        return;
    }
    /*
    if (   recalled_courses === null
        || recalled_courses === undefined
        ||  (
                typeof(recalled_courses) === 'string'
                && recalled_courses.trim().length === 0
            )
    ) {
        return;
    }
    */
    // Look for dataset with a current_state of 2 (in progress), get its name
    let course_still_in_progress;
    if ( recalled_courses ) {
        let ray_of_courses_in_progress = Object.entries(recalled_courses).filter( row => row[1] === 2 );
        console.log(ray_of_courses_in_progress);
        console.log( typeof(ray_of_courses_in_progress) );
        if ( ray_of_courses_in_progress.length ) {
            course_still_in_progress = ray_of_courses_in_progress[0][0];
        }
    }
    if ( course_still_in_progress ) {
        delete recalled_courses[course_still_in_progress];
        course_still_in_progress = edutau.enrolled_prefix + course_still_in_progress + '.';
        console.log( course_still_in_progress);
        recalled_courses = Object.assign( { [course_still_in_progress]: undefined }, recalled_courses );
    }
    console.log(recalled_courses);
    let recalled_text = Object.keys(recalled_courses).join('\n');
    $('#education-input').val( recalled_text );
    $('#education-timestamp').html( 'Recalled from ' + localStorage.getItem( losto_when_name ) + '<br>' );
    //process_education_input();
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
