use strict;
use warnings;
use 5.014;
use utf8;

use YAML::XS qw(LoadFile);
use JSON::XS qw(encode_json);
use Template;
use Encode qw(decode_utf8);

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
    $c->{duration} //= '';
    $c->{cost} //= '';
    my $p = $c->{prerequisites} // [];
    $p = [$p] unless ref($p);
    $c->{prerequisites} = [map +{ name => $_, slug => slug($_) }, @$p];
    $c->{slug} = slug($c->{course});
    return $c;
}

my @all_courses;

for my $filename (glob 'data/*.yaml') {
    next if $filename =~ m{/_};
    push @all_courses, @{ LoadFile $filename };
}

@all_courses = map munge_course($_), @all_courses;
my %courses;
for (@all_courses) {
    $courses{$_->{slug}} = $_;
}

my $template = Template->new();



my %vars = (
    courses => \@all_courses,
    courses_json => decode_utf8 encode_json(\%courses),
);

$template->process('index.html.tt', \%vars, 'index.html', { binmode => ':utf8' })
    or die $template->error;

