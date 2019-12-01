#!/usr/bin/perl -w
# You may distribute under the terms of either the GNU General Public License
# or the Artistic License, as specified in the Perl README file.
use strict; use warnings; use 5.014;
use Getopt::Long qw/:config bundling/;
use Hash::Util qw/ lock_keys /;
our $VERSION = '1.0.0';

## Uses data directory from: https://github.com/taustation-fan/university
our %OPT = (
    datadir => "data",
);
our @OPT_SPEC =
qw/ help|h version
    coming|coming-soon!
    datadir=s
    finished|f=s
    tree|t=s
  /;
sub USAGE { <<"__USAGE__" };
usage: $_[0] [options] DOTFILE [PNGFILE]

OPTIONS

 --finished, -f <file>    file containing list of completed courses
 --tree, -t <name>        generate graph for just named course family
 --coming-soon            include "coming soon" courses

 --datadir <path>         directory containing course YAML files ($OPT{datadir})

 --help, -h               this usage message
 --version                show script version
__USAGE__


use utf8;
use YAML::XS qw/ LoadFile /;

our %TREES = (
    "Combat" => [
        "Advanced Combat",
        "Combat Basics",
        "Defensive Tactics",
        "Intermediate Combat",
        "Special Ops",
    ],

    "Engineering" => [
        "Advanced Ship Engineering",
        "Basic Engineering",
        "Electronics",
        "Ship Engineering",
    ],

    "Medicine" => [
        "Anatomy",
        "First Aid",
    ],

    "Manufacturing" => [
        "Project Management",
        "Construction",
        "Crafting",
    ],

    "Business" => [
        "Bureaucracy",
    ],

    "Social" => [
        "International Relations",
    ],

    "Leadership" => [
        "Leadership",
    ],

    "Spaceship" => [
        "Ship Handling",
        "Ship Technology",
        "Space Navigation",
    ],
);

our %STYLE = (
    coming_soon => { fontcolor => "#616161", color => "#546e7a", style => 'dashed' },
    enrolled    => { fillcolor => "#ffab91", style => 'filled' },
    completed   => { fillcolor => "#90caf9", style => 'filled' },
    eligible    => { fillcolor => "#c5e1a5", style => 'filled' },
    default     => { fillcolor => "#fff59d", style => 'filled' },
);

get_options( \%OPT, @OPT_SPEC );
MAIN(\%OPT, @ARGV);


sub MAIN {
    my ($opt, $dotfile, $imgfile) = @_;
    usage("Output file name required") unless $dotfile;

    my $completed = $OPT{finished} ? load_completed($OPT{finished}) : {};

    {   open my $F, ">:encoding(UTF-8)", $dotfile or die "Error writing to $dotfile: $!";
        say $F 'strict digraph {';
        say $F '  node [shape=box];';
        for my $path (get_files()) {
            next if $path =~ m#/_#;
            my $courses = LoadFile($path);
            say $F "\n  // $path";
            say $F "  $_" for graph($courses, $completed, \%STYLE);
        }
        say $F '}';
    }

    dot($dotfile, $imgfile) if $imgfile;

    # Notify about courses in "finished" file, but not listed in data dir
    say "Unknown course: '$_'" for grep 1 == abs($$completed{$_}), sort keys(%$completed);
}

sub get_files {
    if ($OPT{tree}) {
        die "Unknown discipline '$OPT{tree}\n" unless $TREES{$OPT{tree}};
        return map "$OPT{datadir}/$_.yaml", @{$TREES{$OPT{tree}}};
    } else {
        return glob "$OPT{datadir}/*.yaml"
    }
}

sub dot {
    my ($dotfile, $imgfile) = @_;
    open my $IMG,  ">:raw", $imgfile or die "Error writing to $imgfile: $!";
    open my $DOT, "-|:raw", dot => -Tpng => $dotfile or die "Error executing dot: $!";
    my $buf;
    print $IMG $buf while read $DOT, $buf, 1048576;
}

sub graph {
    my ($courses, $completed, $styles) = @_;
    $completed //= {};
    $styles    //= {};

    my (@course, @edge);
    for my $course (@$courses) {
        my $slug = slug($$course{title});
        my $title = title($$course{title});
        my %style = ( label => $title );
        next if $$course{coming_soon} and !$OPT{coming};
        add_styles(\%style, $$styles{coming_soon}) if $$course{coming_soon};
        add_styles(\%style, $$styles{completed})   if $$completed{$slug} and $$completed{$slug} > 0;
        add_styles(\%style, $$styles{enrolled})    if $$completed{$slug} and $$completed{$slug} < 0;

        $$completed{$slug} *= 2 if $$completed{$slug};
        my $eligible = (%$completed and not ($$completed{$slug} or $$course{coming_soon}));

        if ($$course{prerequisites}) {
            for my $prereq (map slug($_), list($$course{prerequisites})) {
                push @edge, qq#"$prereq" -> "$slug";#;
                $eligible = 0 unless $$completed{$prereq};
            }
        }

        add_styles(\%style, $$styles{eligible})    if $eligible;
        add_styles(\%style, $$styles{default})     if !$$completed{$slug} and !$eligible and !$$course{coming_soon};
        push @course, sprintf('"%s"%s;', $slug, style(\%style));
    }
    return (@course, @edge);
}

sub add_styles {
    my ($style, $new) = @_;
    return unless $new;
    $$style{$_} = $$new{$_} for keys %$new;
}

sub load_completed {
    my $fname = shift;
    open my $F, "<", $fname or die "Error reading $fname: $!";
    my %completed;
    for (<$F>) {
        chomp;
        s/\s*\t.*//;
        s/#.*//;
        if (/^ \s* Enrolled \s+ in \s+ (.+?) \. \s+ Due/x) {
            $completed{slug($1)} = -1;
        } else {
            $completed{slug($_)} = 1 if /\S/;
        }
    }
    return \%completed;
}

sub slug { return (lc($_[0]) =~ s/[^a-zA-Z0-9]+/-/gr); }

sub title {
    local $_ = shift;
    s/^(?:Introduction to|Basic|Intermediate|Advanced)\K\s+/\\n/i;
    s/\s+(?=Master$)/\\n/i;
    s/\s+(?=Mastery|Specialization)/\\n/i;
    s/\s*[-–—,](?!Jump)\s*/\\n/;
    s/\s+(?=Ship Navigation)/\\n/;
    s/\s+(?=Specialist)/\\n/;
    s/(?:Ship Hull|Life Support)\K\s+(?=Maintenance)/\\n/;
    return $_;
}

sub style {
    my $style = shift;
    return "" unless $style and %$style;
    my @attr;
    for my $prop (keys %$style) {
        push @attr, $prop . '=' . (($$style{$prop} =~ /[^a-zA-Z]/) ? '"' . ($$style{$prop} =~ s/"/\\"/gr) . '"' : $$style{$prop});
    }
    return sprintf(" [%s]", join ",", @attr);
}

sub list {
    my $l = shift;
    return unless defined($l);
    return $l unless ref($l);
    return @$l;
}

sub get_options {
    my $OPT = shift;
    GetOptions $OPT, @_ or usage(1);
    usage() if $$OPT{help} || $$OPT{version};
    lock_keys(%$OPT, keys %$OPT, map /^(\w+)/, @_);
}

sub usage {
    my $status = (@_ && $_[0] =~ /^\d+$/) ? shift(@_) : 0+@_;
    print @_, "\n" if @_;
    require File::Spec; my $exe = (File::Spec->splitpath($0))[2];
    $OPT{$_} = $OPT{$_} ? "enabled" : "disabled" for map /^(\w+).*!/, @OPT_SPEC;
    print $OPT{version} ? "$exe version $VERSION\n" : USAGE($exe);
    exit $status;
}
