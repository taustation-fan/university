# Tau Station University Courses

This repository contains the source code for <https://education.tauguide.de/>,
the [Tau Station](https://taustation.space) University courses list and manager.

The course data is stored in the `data/` directory in [YAML](http://yaml.org/)
files, one file per module.

The data is pre-processed by the Perl script `render.pl`, which inserts
it as JSON into the template `index.html.tt`, and generates `index.html`.

The Javascript application is in `assets/univ.js`, and uses jQuery and the
[Dynatable.js](https://www.dynatable.com/) extension.
