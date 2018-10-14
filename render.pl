use strict;
use warnings;
use 5.014;
use utf8;
binmode STDOUT, ':encoding(UTF-8)';

use YAML::XS qw(LoadFile);
use JSON::XS qw(encode_json);
use Template;
use Encode qw(decode_utf8);
use List::Util qw(sum);

use Data::Dumper;

my %translate = (
    title   => 'course',
    time    => 'duration',
);

sub slug {
    my $name = shift;
    my $slug = lc $name;
    $slug =~ s/[^a-z0-9]+/-/g;
    return "course-$slug";
}

sub munge_course {
    my $c = shift;
    my $av = (delete $c->{availability}) || [];
    for my $u (@$av) {
        $c->{lc $u} = 1;
    }
    $c->{$_} //= 0 for qw(tau nl sob moi);
    for my $k (sort keys %translate) {
        $c->{ $translate{$k} } = delete $c->{$k};
    }
    $c->{duration} += 0;    # Turn into JSON numbers
    $c->{duration} //= '';
    $c->{cost} += 0;        # Turn into JSON numbers
    $c->{cost} //= '';
    $c->{level} += 0;       # Turn into JSON numbers
    my $p = $c->{prerequisites} // [];
    $p = [$p] unless ref($p);
    $c->{prerequisites} = [map +{ name => $_, slug => slug($_) }, @$p];
    $c->{slug} = slug($c->{course});
    $c->{available} = 1 if @$av;
    return $c;
}

my @all_courses;

for my $filename (glob 'data/*.yaml') {
    next if $filename =~ m{/_};
    push @all_courses, @{ LoadFile $filename };
}

@all_courses = map munge_course($_), @all_courses;
if ($ENV{VERBOSE}) {
    my @unavailable = grep !$_->{available}, @all_courses;
    if (@unavailable) {
        say "Unavailable: ";
        say "    $_" for  map $_->{course}, @unavailable;
    }
}

my @available_courses = grep $_->{available}, @all_courses;

my %courses;
for (@available_courses) {
    $courses{$_->{slug}} = $_;
}
say 'Total duration in days: ', (sum map $_->{duration}, @available_courses) / 100
    if $ENV{VERBOSE};

my $template = Template->new();


my %vars = (
    courses => \@available_courses,
    courses_json => decode_utf8( JSON::XS->new->utf8->pretty->canonical->encode(\%courses) ),
);

$template->process('index.html.tt', \%vars, 'index.html', { binmode => ':utf8' })
    or die $template->error;

