<?php
/**
 * Custom scripts and styles.
 *
 * @package omarSamad
 */

/**
 * Register Google font.
 *
 * @link http://themeshaper.com/2014/08/13/how-to-add-google-fonts-to-wordpress-themes/
 */
function _font_url() {

	$fonts_url = '';

	/**
	 * Translators: If there are characters in your language that are not
	 * supported by the following, translate this to 'off'. Do not translate
	 * into your own language.
	 */
	$raleway = _x( 'on', 'Raleway font: on or off', 'omarsamad' );
	$open_sans = _x( 'on', 'Open Sans font: on or off', 'omarsamad' );

	if ( 'off' !== $raleway || 'off' !== $open_sans ) {
		$font_families = array();

		if ( 'off' !== $raleway ) {
			$font_families[] = 'Raleway:400,700';
		}

		if ( 'off' !== $open_sans ) {
			$font_families[] = 'Open Sans:400,300,700';
		}

		$query_args = array(
			'family' => urlencode( implode( '|', $font_families ) ),
		);

		$fonts_url = add_query_arg( $query_args, '//fonts.googleapis.com/css' );
	}

	return $fonts_url;
}

/**
 * Enqueue scripts and styles.
 */
function _scripts() {
	/**
	 * If WP is in script debug, or we pass ?script_debug in a URL - set debug to true.
	 */
	$debug = ( defined( 'SCRIPT_DEBUG' ) && SCRIPT_DEBUG == true ) || ( isset( $_GET['script_debug'] ) ) ? true : false;

	/**
	 * If we are debugging the site, use a unique version every page load so as to ensure no cache issues.
	 */
	$version = '1.0.0';

	/**
	 * Should we load minified files?
	 */
	$suffix = ( true === $debug ) ? '' : '.min';

	// Register styles.
	wp_register_style( 'omarsamad-google-font', _font_url(), array(), null );

	// Enqueue styles.
	wp_enqueue_style( 'omarsamad-google-font' );
	wp_enqueue_style( 'omarsamad-style', get_stylesheet_directory_uri() . '/style' . $suffix . '.css', array(), $version );

	// Enqueue scripts.
	wp_enqueue_script( 'omarsamad-scripts', get_template_directory_uri() . '/assets/scripts/project' . $suffix . '.js', array( 'jquery' ), $version, true );
	
	//Enqueue Video overlay script
	if (is_front_page() || is_single() ) {
			wp_enqueue_script( 'video-animation', get_template_directory_uri() . '/assets/scripts/video-animation' . $suffix . '.js', array( 'jquery' ), $version, true );
	}

	//Comments
	if ( is_singular() && comments_open() && get_option( 'thread_comments' ) ) {
		wp_enqueue_script( 'comment-reply' );
	}

	// Enqueue the mobile nav script
	// Since we're showing/hiding based on CSS and wp_is_mobile is wp_is_imperfect, enqueue this everywhere.
	wp_enqueue_script( 'omarsamad-mobile-nav', get_template_directory_uri() . '/assets/scripts/mobile-nav-menu' . $suffix . '.js', array( 'jquery' ), $version, true );
}
add_action( 'wp_enqueue_scripts', '_scripts' );





/**
 * Add SVG definitions to footer.
 */
function _include_svg_icons() {

	// Define SVG sprite file.
	$svg_icons = get_template_directory() . '/assets/images/svg-icons.svg';

	// If it exists, include it.
	if ( file_exists( $svg_icons ) ) {
		require_once( $svg_icons );
	}
}
add_action( 'wp_footer', '_include_svg_icons', 9999 );



