#!/usr/bin/env perl

# Sort the YAML list elements by their keys

use strict;
use warnings;
use 5.020;
$| = 1;

use YAML::XS ();

chdir 'data' or die $!;

for my $file ( glob '[A-Z]*.yaml' ) {
    my $data_perl = YAML::XS::LoadFile( $file );
    YAML::XS::DumpFile( $file, $data_perl );
}

__END__

