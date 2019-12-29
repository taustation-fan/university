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
    let value = this.getItem(key);
    return value && JSON.parse(value);
};

function course_slug(name) {
    let slug = name.toLowerCase().replace( /[^a-z0-9]+/g, '-' );
    return 'course-' + slug;
}

function commify(val) {
    return val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function Course(name, state) {
    this.states = edutau.global_course_states;
    this.name = name;
    this.current_state = 1;
    this.next_state = function() {
        let state_now = this.current_state + 1;
        if ( state_now > Math.max( ... Object.keys(this.states).map( x => parseInt(x) ) ) ) {
            state_now = 1;
        }
        this.current_state = state_now;
    };
    this.get_state = function() {
        let my_state = this.current_state;
        return my_state;
    };
    this.get_state_value = function() {
        let my_state = this.states[ this.current_state ];
        return my_state;
    };
    this.get_next_state_value = function() {
        let next_state = this.current_state + 1;
        if ( next_state > Math.max( ... Object.keys(this.states).map( x => parseInt(x) ) ) ) {
            next_state = 1;
        }
        let my_state = this.states[ next_state ];
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
    let course_in_progress = null;
    ray.forEach(function(c) {
        let the_course = new Course;
        let match_enrolled = enrolled_regex.exec(c);
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
        if ( course.current_state > 1 ) {
            lite[ course.name ] = course.current_state;
        }
    }
    return lite;
}

function get_course_in_progress_name(all_courses) {
    if ( all_courses === null ) {
        return '';
    }
    let courses_in_progress = Object.entries(all_courses).filter( row => row[1] === 2 );
    if ( courses_in_progress.length ) {
        let single_course_in_progress = courses_in_progress[0][0];
        return single_course_in_progress;
    }
    return '';
}

function get_courses_done_name(all_courses) {
    if ( all_courses === null ) {
        return [];
    }
    let courses_done = Object.entries(all_courses).filter( row => row[1] === 3 );
    if ( courses_done.length ) {
        let all_courses_done = courses_done.map( x => x[0] );
        return all_courses_done;
    }
    return [];
}

function get_courses_not_found_name(all_courses) {
    if ( all_courses === null ) {
        return [];
    }
    let courses_not_found = Object.entries(all_courses).filter( row => row[1] === 0 );
    if ( courses_not_found.length ) {
        let all_courses_done = courses_not_found.map( x => x[0] );
        return all_courses_done;
    }
    return [];
}

function get_course_by_name(name) {
    let the_course = edutau.all_courses.filter( row => row.name === name )[0];
    // Create the course if it's not in edutau.all_courses yet
    if( the_course === undefined ) {
        let new_entry = new Course;
        new_entry.current_state = 1; // not done
        new_entry.name = name;
        new_entry.slug = course_slug( name );
        edutau.all_courses.unshift( new_entry );
        return new_entry;
    }
    return the_course;
}

function update_user_provided_list() {
    let input_field = $('#education-input');
    let courses_taken = {};
    Object.entries( lite_courses() ).filter( x => x[1] > 1 ).map( x => courses_taken[ x[0] ] = x[1] )
    // TODO refactor into separate function, also see process_education_recall()
    let course_still_in_progress = get_course_in_progress_name(courses_taken);
    if ( course_still_in_progress ) {
        delete courses_taken[course_still_in_progress];
        course_still_in_progress = edutau.enrolled_prefix + course_still_in_progress + '.';
        courses_taken = Object.assign( { [course_still_in_progress]: 2 }, courses_taken );
    }
    let taken_text = Object.keys(courses_taken).join('\n');
    input_field.val( taken_text );
    return;
}

function process_education_input() {
    reduce_to_courses();
    courses_to_objects();
    if ( ! edutau.all_courses ) {
        return;
    }
    let the_lite_courses = lite_courses();
    // look for course with state "in progress"
    let course_in_progress = get_course_in_progress_name( the_lite_courses );
    let slug_course_in_progress = null; // turn its name into slug
    // all courses with state "done"
    let courses = get_courses_done_name( the_lite_courses );
    let courses_done = {};
    let course_credits = 0;
    $('tr.in-progress').removeClass('in-progress');
    if (course_in_progress) {
        slug_course_in_progress = course_slug(course_in_progress);
        let course_row = document.univ_courses[slug_course_in_progress];
        if (course_row) {
            course_row.status = 'In Progress';
            $('#' + slug_course_in_progress).addClass('in-progress');
            course_credits += course_row.cost;
        }
    }
    let found = 0;
    let not_found = get_courses_not_found_name( the_lite_courses );
    courses.forEach(function(c) {
        let slug = course_slug(c);
        let course_row = document.univ_courses[slug];
        if (course_row) {
            course_row.status = 'Done';
            course_credits += course_row.cost;
            found ++;
        } else {
            not_found.push(c);
        }
    });

    // Mark eligible courses (all prerequisites done)
    $('#univ tbody tr').each(function(idx) {
        let $tr = $(this);
        let $dom = $tr.find('.done');
        if (!$dom.length) { return; }

        let course = document.univ_courses[this.id];
        if (course) {
            if (course.status == 'Done') {
                $dom.html('<span title="completed">✔</span>');
            }
            else if (course.status == 'In Progress') {
                $dom.html('<span title="in progress">⌚</span>');
            }

            // Check if prerequisites completed:
            else {
                let prereqs = $tr.find('.prereqs .course-link');
                let prereqs_met = true;
                prereqs.each(function(idx) {
                    let slug = $(this).attr('data-slug');
                    let prereq = document.univ_courses[slug];
                    if (!(prereq && (prereq.status === 'Done' || prereq.status === 'In Progress'))) {
                        prereqs_met = false;
                    }
                });

                $dom.html(prereqs_met ? '' : '<span title="missing prerequisites">✖</span>');
            }
        }
    });

    let total = Object.keys(document.univ_courses).length;
    let msg = 'You finished ' + found + ' courses out of ' + total + '.';
    if (not_found.length) {
        msg += "<br>You also finished the following courses that I know nothing about: " + not_found.join(', ');
    }
    if (course_credits) {
        msg += "<br>You have spent at least " + commify(course_credits) + " credits on your education.";
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
    let course_still_in_progress = get_course_in_progress_name(recalled_courses);
    if ( course_still_in_progress ) {
        delete recalled_courses[course_still_in_progress];
        course_still_in_progress = edutau.enrolled_prefix + course_still_in_progress + '.';
        recalled_courses = Object.assign( { [course_still_in_progress]: undefined }, recalled_courses );
    }
    let recalled_text = Object.keys(recalled_courses).join('\n');
    $('#education-input').val( recalled_text );
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

// Recall filter from local storage
function filter_recall() {
    let ls_name  = 'tablesorter-filters';
    let ls_value = localStorage.getItem(ls_name);
    let select_map = { // See get_filter() further down
        'undefined': 'all',
        '!✔':        'open',
        '✔ or ⌚':   'done',
        '!✔ and !✖': 'eligible'
    };
    if ( ls_value === null ) {
        return;
    }
    let struct;
    try {
        struct = JSON.parse(ls_value);
    }
    catch (e) {
        return;
    }
    let beef      = struct[window.location.pathname]['univ'][11];
    let beef_utf8 = decodeURIComponent(beef);
    let selected  = select_map[beef_utf8];
    $('#donedeps').val(selected);
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
        return '✔ or ⌚';
    }
    else if (mode === 'eligible') {
        return "!✔ and !✖";
    }
}

function topo_sorted_slugs() {
    if (document.univ_courses_sorted) {
        return document.univ_courses_sorted;
    }

    // build a list of all edges in the graph
    let edges = []
    for (let course_idx in document.univ_courses) {
        let course = document.univ_courses[course_idx];
        for (let p_idx in course.prerequisites) {
            edges.push([course.slug, course.prerequisites[p_idx].slug]);
        }
    }
    // tsort from file assets/toposort.js
    let sorted = tsort(edges);
    sorted.reverse();
    document.univ_courses_sorted = sorted;
    return sorted;
}

function recursive_prerequisties(course) {
    // find all recursive prerequisites, in any order:
    let all_prereqs = [];
    let seen = {};
    function visit(prereqs) {
        for (let idx in prereqs) {
            let p = document.univ_courses[prereqs[idx].slug];
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
    let r_obj = {}
    all_prereqs.forEach(function(r) {
        r_obj[r.slug] = r;
    });
    let sorted_prereqs = [];
    topo_sorted_slugs().forEach(function (r) {
        if (r_obj.hasOwnProperty(r)) {
            sorted_prereqs.push(r_obj[r]);
        }
    });

    return sorted_prereqs;
}

function fill_ul($ul, prereq) {
    $ul.html('');
    for (let idx in prereq) {
        let title = (prereq[idx].name || prereq[idx].course);
        let status = prereq[idx].status;
        if (status) {
            title += ' [' + status + ']';
        }
        let $a = $('<a>', {
            text: title,
            href: '#',
            data: {'slug': prereq[idx].slug},
            click: show_details,
        });
        let $li = $('<li>').html($a);
        $ul.append($li)
    }
}

function show_details() {
    let slug   = $(this).data('slug');
    let course = document.univ_courses[slug];
    let $cont  = $('#course_details');
    $cont.find('#course_details_name').text(course.course);
    $cont.find('#course_details_level').text(course.level);
    $cont.find('#course_details_duration').text(course.duration);
    $cont.find('#course_details_cost').text(course.cost);
    //$cont.find('#course_details_status').text( course.status || 'Not Done' );
    $cont.find('#course_details_description').text(course.description || '');
    $cont.find('#course_details_measurement').text(course.measurement || '');

    let course_name = course.course;
    let course_obj  = get_course_by_name(course_name);

    function show_state_on_detail_page() {
        let next_state = course_obj.get_next_state_value();
        $cont.find('#course_next_state').text( next_state || '' );
        $cont.find('#course_details_status').text( course.status || 'Not Done' );
    }

    show_state_on_detail_page();
    $('#change_course_state > a.button').off('click').on( 'click', function() {
        // TODO make sure there is at most one and only one course in progress
        course_obj.next_state();
        course.status = course_obj.get_state_value();

        for (let c of edutau.all_courses) {
            if (c.name == course_name) {
                c.current_state = course_obj.current_state;
            }
        }
        show_state_on_detail_page();
        update_user_provided_list();
        process_education_store();
        process_education_input();
        return false;
    });

    let universities = {
        tau: 'Tau Station (Sol)',
        nl:  'Nouveau Limoges (Sol)',
        moi: 'Moissan (Alpha Centauri)',
        sob: 'Spirit of Botswana (Alpha Centauri)',
        cvs: 'Cape Verde Stronghold (YZ Ceti)',
    };

    let avail = [];
    let keys = Object.keys(universities);
    keys.sort();
    for (let idx in keys) {
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
        let rp = recursive_prerequisties(course);
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
                11: {
                    all: function() { return true },
                    done: get_filter('done'),
                    open: get_filter('open'),
                }
            }

        }
    });

    $('.checksearch, #donedeps').on('change', function() {
        let filter = [];
        $('.checksearch').each(function() {
            let $s = $(this);
            if ($s.prop('checked')) {
                filter[$s.data('col')] = '✔';
            }
        });
        let doneness = $('#donedeps').prop('value');
        filter[11] = get_filter(doneness);
        $('#univ').trigger('search', [ filter ]);

    });

    $('.course-link').click(show_details);
    $('#education-input-button').click(process_education_input);
    $('#education-clear-button').click(process_education_clear);
    $('#education-store-button').click(process_education_store);
    $('#education-recall-button').click(process_education_recall);
    $('#education-forget-button').click(process_education_forget);
    process_education_recall(); // Run on page load
    filter_recall();
    $(document).keyup(function(e) {
        if (e.keyCode == 27) {
            // ESCape key pressed => hide popup
            $('#course_details').hide();
        }
    });
});
