#!/usr/bin/env bash

# Dependencies:
#
# **imagemagick**
# **gdal**
#
# sudo add-apt-repository ppa:ubuntugis/ppa && sudo apt-get update
# sudo apt-get install gdal-bin
# sudo apt-get install python-gdal

input_file=assets/images/maps/BNA_1854.png

image_name=$(basename $input_file | cut -f 1 -d '.')
output_dir="assets/images/maps/tiles/$image_name"

echo "Outputting to $output_dir"

image_width=$(identify -format "%w" $input_file)
image_height=$(identify -format "%h" $input_file)

tmp_dir=.slicer_tmp/

mkdir $tmp_dir
wgs_coord_file="$tmp_dir/wgs84.vrt"
google_maps_coord_file="$tmp_dir/google_coord.vrt"

# NS are Latitudes, EW are longitudes
bound_n=81.69
bound_e=-17.58
bound_s=27.87
bound_w=-181.56

# inject Ground Control Points (GCPs) and export as a new file that contains that information.
#
# EPSG:4326 is the extremely common WGS84 standard (eg. LAT, LNG)
gdal_translate -of VRT -expand rgba -a_srs EPSG:4326 -gcp 0 0 $bound_w $bound_n -gcp $image_width 0 $bound_e $bound_n -gcp $image_width $image_height $bound_e $bound_s $input_file $wgs_coord_file


# Now to convert to Google's projection, otherwise it'll be wonky.
#
# EPSG:3857 is the Web Mercator standard that Google made up (aka. 900913)
gdalwarp -of VRT -t_srs EPSG:3857 $wgs_coord_file $google_maps_coord_file

# Alternative: using icky google mercator meter coordinates
#bound_n=8109796.717743561
#bound_e=196252.07012218982
#bound_s=6438749.514630105
#bound_w=-910307.6791052371
#gdal_translate -of VRT -a_srs EPSG:3857 -gcp 0 0 $bound_w $bound_n -gcp $image_width 0 $bound_e $bound_n -gcp $image_width $image_height $bound_e bounds_s $input_file $google_maps_coord_file

# the -z arg is for the zoom range to support in Google maps. Min possible zoom is 0, max is 21
gdal2tiles.py -p mercator -z 0-4 $google_maps_coord_file $output_dir

rm -rf $tmp_dir