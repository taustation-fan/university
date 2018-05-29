use strict;
use warnings;
use 5.014;
use utf8;

use YAML::XS qw(LoadFile);
use JSON::XS qw(encode_json);
use Template;

use Data::Dumper;

my %translate = (
    title   => 'course',
    time    => 'duration',
);

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
    $c->{prerequisites} //= '(none)';
    return $c;
}

my @all_courses;

for my $filename (glob 'data/*.yaml') {
    next if $filename =~ m{/_};
    push @all_courses, @{ LoadFile $filename };
}

@all_courses = map munge_course($_), @all_courses;

my $template = Template->new();

open my $out, '>', 'assets/univ-data.json'
    or die "Cannot write to file assets/univ-data.json: $!";
print $out encode_json(\@all_courses), "\n";
close $out;

$template->process('index.html.tt', { courses => \@all_courses }, 'index.html')
    or die $template->error;

say $template;
