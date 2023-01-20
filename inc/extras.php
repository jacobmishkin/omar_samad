<?php
/**
 * Custom functions that act independently of the theme templates.
 *
 * Eventually, some of the functionality here could be replaced by core features.
 *
 * @package omarSamad
 */

/**
 * Adds custom classes to the array of body classes.
 *
 * @param array $classes Classes for the body element.
 * @return array
 */
function _body_classes( $classes ) {

	// @codingStandardsIgnoreStart
	// Allows for incorrect snake case like is_IE to be used without throwing errors.
	global $is_IE;

	// If it's IE, add a class.
	if ( $is_IE ) {
		$classes[] = 'ie';
	}
	// @codingStandardsIgnoreEnd

	// Give all pages a unique class.
	if ( is_page() ) {
		$classes[] = 'page-' . basename( get_permalink() );
	}

	// Adds a class of hfeed to non-singular pages.
	if ( ! is_singular() ) {
		$classes[] = 'hfeed';
	}

	// Adds a class of group-blog to blogs with more than 1 published author.
	if ( is_multi_author() ) {
		$classes[] = 'group-blog';
	}

	// Are we on mobile?
	// PHP CS wants us to use jetpack_is_mobile instead, but what if we don't have Jetpack installed?
	// Allows for using wp_is_mobile without throwing an error.
	// @codingStandardsIgnoreStart
	if ( wp_is_mobile() ) {
		$classes[] = 'mobile';
	}
	// @codingStandardsIgnoreEnd

	// Adds "no-js" class. If JS is enabled, this will be replaced (by javascript) to "js".
	$classes[] = 'no-js';

	return $classes;
}
add_filter( 'body_class', '_body_classes' );

/**
 * Add custom image sizes attribute to enhance responsive image functionality
 * for content images
 *
 * @package omarSamad
 *
 * @param string $sizes A source size value for use in a 'sizes' attribute.
 * @param array  $size  Image size. Accepts an array of width and height
 *                      values in pixels (in that order).
 * @return string A source size value for use in a content image 'sizes' attribute.
 */
function _content_image_sizes_attr( $sizes, $size ) {
	$width = $size[0];

	840 <= $width && $sizes = '(max-width: 709px) 85vw, (max-width: 909px) 67vw, (max-width: 1362px) 62vw, 840px';

	if ( 'page' === get_post_type() ) {
		840 > $width && $sizes = '(max-width: ' . $width . 'px) 85vw, ' . $width . 'px';
	} else {
		840 > $width && 600 <= $width && $sizes = '(max-width: 709px) 85vw, (max-width: 909px) 67vw, (max-width: 984px) 61vw, (max-width: 1362px) 45vw, 600px';
		600 > $width && $sizes = '(max-width: ' . $width . 'px) 85vw, ' . $width . 'px';
	}

	return $sizes;
}
add_filter( 'wp_calculate_image_sizes', '_content_image_sizes_attr', 10 , 2 );

/**
 * Add custom image sizes attribute to enhance responsive image functionality
 * for post thumbnails
 *
 * @package omarSamad
 *
 * @param array $attr Attributes for the image markup.
 * @param int   $attachment Image attachment ID.
 * @param array $size Registered image size or flat array of height and width dimensions.
 * @return string A source size value for use in a post thumbnail 'sizes' attribute.
 */
function _post_thumbnail_sizes_attr( $attr, $attachment, $size ) {
	if ( 'post-thumbnail' === $size ) {
		is_active_sidebar( 'sidebar-1' ) && $attr['sizes'] = '(max-width: 709px) 85vw, (max-width: 909px) 67vw, (max-width: 984px) 60vw, (max-width: 1362px) 62vw, 840px';
		! is_active_sidebar( 'sidebar-1' ) && $attr['sizes'] = '(max-width: 709px) 85vw, (max-width: 909px) 67vw, (max-width: 1362px) 88vw, 1200px';
	}
	return $attr;
}
add_filter( 'wp_get_attachment_image_attributes', '_post_thumbnail_sizes_attr', 10 , 3 );

/**
 * Returns true if a blog has more than 1 category.
 *
 * @return bool
 */
function _categorized_blog() {
	if ( false === ( $all_the_cool_cats = get_transient( '_categories' ) ) ) {
		// Create an array of all the categories that are attached to posts.
		$all_the_cool_cats = get_categories( array(
			'fields'     => 'ids',
			'hide_empty' => 1,
			// We only need to know if there is more than one category.
			'number'     => 2,
		) );

		// Count the number of categories that are attached to the posts.
		$all_the_cool_cats = count( $all_the_cool_cats );

		set_transient( '_categories', $all_the_cool_cats );
	}

	if ( $all_the_cool_cats > 1 ) {
		// This blog has more than 1 category so _categorized_blog should return true.
		return true;
	} else {
		// This blog has only 1 category so _categorized_blog should return false.
		return false;
	}
}

/**
 * Flush out the transients used in _categorized_blog.
 */
function _category_transient_flusher() {
	if ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) {
		return false;
	}
	// Like, beat it. Dig?
	delete_transient( '_categories' );
}
add_action( 'delete_category', '_category_transient_flusher' );
add_action( 'save_post',     '_category_transient_flusher' );

/**
 * Get an attachment ID from it's URL.
 *
 * @param string $attachment_url The URL of the attachment.
 * @return int The attachment ID.
 */
function _get_attachment_id_from_url( $attachment_url = '' ) {

	global $wpdb;

	$attachment_id = false;

	// If there is no url, return.
	if ( '' === $attachment_url ) {
		return false;
	}

	// Get the upload directory paths.
	$upload_dir_paths = wp_upload_dir();

	// Make sure the upload path base directory exists in the attachment URL, to verify that we're working with a media library image.
	if ( false !== strpos( $attachment_url, $upload_dir_paths['baseurl'] ) ) {

		// If this is the URL of an auto-generated thumbnail, get the URL of the original image.
		$attachment_url = preg_replace( '/-\d+x\d+(?=\.(jpg|jpeg|png|gif)$)/i', '', $attachment_url );

		// Remove the upload path base directory from the attachment URL.
		$attachment_url = str_replace( $upload_dir_paths['baseurl'] . '/', '', $attachment_url );

		// Do something with $result.
		$attachment_id = $wpdb->get_var( $wpdb->prepare( "SELECT wposts.ID FROM $wpdb->posts wposts, $wpdb->postmeta wpostmeta WHERE wposts.ID = wpostmeta.post_id AND wpostmeta.meta_key = '_wp_attached_file' AND wpostmeta.meta_value = '%s' AND wposts.post_type = 'attachment'", $attachment_url ) ); // WPCS: db call ok , cache ok.
	}

	return $attachment_id;
}

/**
 * Returns an <img> that can be used anywhere a placeholder image is needed
 * in a theme. The image is a simple colored block with the image dimensions
 * displayed in the middle.
 *
 * @author Ben Lobaugh
 * @throws Exception Details of missing parameters.
 * @param array $args {.
 *		@type int $width
 *		@type int $height
 *		@type string $background_color
 *		@type string $text_color
 * }
 * @return string
 **/
function _placeholder_image( $args = array() ) {
	$default_args = array(
		'width'				=> '',
		'height'			=> '',
		'background_color'	=> 'dddddd',
		'text_color'		=> '000000',
	);

	$args = wp_parse_args( $args, $default_args );

	// Extract the vars we want to work with.
	$width 				= $args['width'];
	$height			 	= $args['height'];
	$background_color	= $args['background_color'];
	$text_color 		= $args['text_color'];

	// Perform some quick data validation.
	if ( ! is_numeric( $width ) ) {
		throw new Exception( __( 'Width must be an integer', 'omarsamad' ) );
	}

	if ( ! is_numeric( $height ) ) {
		throw new Exception( __( 'Height must be an integer', 'omarsamad' ) );
	}

	if ( ! ctype_xdigit( $background_color ) ) {
		throw new Exception( __( 'Please provide a valid hex color value for background_color', 'omarsamad' ) );
	}

	if ( ! ctype_xdigit( $text_color ) ) {
		throw new Exception( __( 'Please provide a valid hex color value for text_color', 'omarsamad' ) );
	}

	// Set up the url to the image.
	$url = "http://placeholder.wdslab.com/i/{$width}x$height/$background_color/$text_color";

	// Text that will be utilized by screen readers.
	$alt = apply_filters( '_placeholder_image_alt', __( 'WebDevStudios Placeholder Image', 'omarsamad' ) );

	return "<img src='$url' width='$width' height='$height' alt='$alt' />";
}

/**
 * Returns an photo from Unsplash.com wrapped in an <img> that can be used
 * in a theme. There are limited category and search capabilities to attempt
 * matching the site subject.
 *
 * @author Ben Lobaugh
 * @throws Exception Details of missing parameters.
 * @param array $args {.
 *		@type int $width
 *		@type int $height
 *		@type string $category Optional. Maybe be one of: buildings, food, nature, people, technology, objects
 *		@type string $keywords Optional. Comma seperated list of keywords, such as: sailboat, water
 * }
 * @return string
 **/
function _placeholder_unsplash( $args = array() ) {
	$default_args = array(
		'width'				=> '',
		'height'			=> '',
		'category'			=> '',
		'keywords'			=> '',
	);

	$args = wp_parse_args( $args, $default_args );

	$valid_categories = array(
		'buildings',
		'food',
		'nature',
		'people',
		'technology',
		'objects',
	);

	// If there is an invalid category lets erase it.
	if ( ! empty( $args['category'] )  && ! in_array( $args['category'], $valid_categories, true ) ) {
		$args['category'] = '';
	}

	// Perform some quick data validation.
	if ( ! is_numeric( $args['width'] ) ) {
		throw new Exception( __( 'Width must be an integer', 'omarsamad' ) );
	}

	if ( ! is_numeric( $args['height'] ) ) {
		throw new Exception( __( 'Height must be an integer', 'omarsamad' ) );
	}

	// Set up the url to the image.
	$url = 'https://source.unsplash.com/';

	// Apply a category if desired.
	if ( ! empty( $args['category'] ) ) {
		$category = rawurlencode( $args['category'] );
		$url .= "category/$category/";
	}

	// Dimensions go after category but before search keywords.
	$url .= "{$args['width']}x{$args['height']}";

	if ( ! empty( $args['keywords'] ) ) {
		$keywords = rawurlencode( $args['keywords'] );
		$url .= "?$keywords";
	}

	// Text that will be utilized by screen readers.
	$alt = apply_filters( '_placeholder_image_alt', __( 'WebDevStudios Placeholder Image', 'omarsamad' ) );

	return "<img src='$url' width='{$args['width']}' height='{$args['height']}' alt='$alt' />";
}

//adding CPT's to archive.php
function query_post_type($query) {
  if($query->is_main_query()
    && ( is_category() )) {
        $query->set( 'post_type', array('post','film_portfolio') );
  }
}
add_filter('pre_get_posts', 'query_post_type');



//CPT for Film Portfolio 
// Register Custom Post Type
function custom_film_portfolio_() {

	$labels = array(
		'name'                  => _x( 'films', 'Post Type General Name', 'text_domain' ),
		'singular_name'         => _x( 'film', 'Post Type Singular Name', 'text_domain' ),
		'menu_name'             => __( 'Films', 'text_domain' ),
		'name_admin_bar'        => __( 'Films', 'text_domain' ),
		'archives'              => __( 'Film Archives', 'text_domain' ),
		'parent_item_colon'     => __( 'Parent Films:', 'text_domain' ),
		'all_items'             => __( 'All Films', 'text_domain' ),
		'add_new_item'          => __( 'Add New Film', 'text_domain' ),
		'add_new'               => __( 'Add Film', 'text_domain' ),
		'new_item'              => __( 'New Film', 'text_domain' ),
		'edit_item'             => __( 'Edit Film', 'text_domain' ),
		'update_item'           => __( 'Update Film', 'text_domain' ),
		'view_item'             => __( 'View Film', 'text_domain' ),
		'search_items'          => __( 'Search Film', 'text_domain' ),
		'not_found'             => __( 'Not found', 'text_domain' ),
		'not_found_in_trash'    => __( 'Not found in Trash', 'text_domain' ),
		'featured_image'        => __( 'Featured Image', 'text_domain' ),
		'set_featured_image'    => __( 'Set featured image', 'text_domain' ),
		'remove_featured_image' => __( 'Remove featured image', 'text_domain' ),
		'use_featured_image'    => __( 'Use as featured image', 'text_domain' ),
		'insert_into_item'      => __( 'Insert into Film', 'text_domain' ),
		'uploaded_to_this_item' => __( 'Uploaded to this Films', 'text_domain' ),
		'items_list'            => __( 'Film list', 'text_domain' ),
		'items_list_navigation' => __( 'Films list navigation', 'text_domain' ),
		'filter_items_list'     => __( 'Filter Film list', 'text_domain' ),
	);
	$args = array(
		'label'                 => __( 'film', 'text_domain' ),
		'description'           => __( 'The place to add any films you have worked on', 'text_domain' ),
		'labels'                => $labels,
		'supports'              => array( 'title', 'editor', 'thumbnail', ),
		'taxonomies'            => array( 'category', 'post_tag' ),
		'hierarchical'          => false,
		'public'                => true,
		'show_ui'               => true,
		'show_in_menu'          => true,
		'menu_position'         => 5,
		'menu_icon'             => 'dashicons-portfolio',
		'show_in_admin_bar'     => true,
		'show_in_nav_menus'     => true,
		'can_export'            => true,
		'has_archive'           => true,		
		'exclude_from_search'   => false,
		'publicly_queryable'    => true,
		'capability_type'       => 'page',
	);
	register_post_type( 'film_portfolio', $args );

}
add_action( 'init', 'custom_film_portfolio_', 0 );



