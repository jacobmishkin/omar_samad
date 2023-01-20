<?php
/**
 * The header for our theme.
 *
 * This is the template that displays all of the <head> section and everything up until <div id="content">
 *
 * @link https://developer.wordpress.org/themes/basics/template-files/#template-partials
 *
 * @package omarSamad
 */

?>
<!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
	<meta charset="<?php bloginfo( 'charset' ); ?>">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<link rel="profile" href="http://gmpg.org/xfn/11">
	<link rel="pingback" href="<?php bloginfo( 'pingback_url' ); ?>">

	<?php wp_head(); ?>
</head>

<body <?php body_class(); ?>>
<div id="page" class="site">
	<a class="skip-link screen-reader-text" href="#main"><?php esc_html_e( 'Skip to content', 'omarsamad' ); ?></a>
			<nav id="mobile-navigation" class="mobile-navigation" role="navigation">
				<?php wp_nav_menu( array( 'theme_location' => 'phone-menu', 'menu_id' => 'mobile', 'class' => 'mobile') ); ?>
			</nav><!-- #site-navigation -->
			<button class="menu-toggle" aria-controls="primary-menu" aria-expanded="false"><?php esc_html_e( '', 'omarsamad' ); ?>
					<svg width="75px" height="20px" viewBox="0 0 63 19">
		    		<g id="mobile-nav" stroke-width="1">
		    			<g class="burger-icon">
				        <path d="M23,4 L33,4" 	id="line1" stroke="#fff" 	 stroke-linecap="square"></path>
				        <path d="M23,16 L33,16" id="line3" stroke="#fff" 	 stroke-linecap="square"></path>
				        <path d="M23,10 L33,10" id="line2" stroke="#fff" 	 stroke-linecap="square"></path>
		      		</g> 
			        <text id="leter-m"  font-size="20" font-weight="400" fill="#fff">
			            <tspan x="0" y="17">m</tspan>
			        </text>
			        <text id="nu" font-size="20" font-weight="400" fill="#fff">
			            <tspan x="39" y="17">nu</tspan>
			        </text>
			    	</g>
					</svg>
				</button>
	<header class="site-header">
		<div class="wrap">
			<div class="site-branding">
				<?php if ( is_front_page() && is_home() ) : ?>
					<h1 class="site-title"><a href="<?php echo esc_url( home_url( '/' ) ); ?>" rel="home"><?php bloginfo( 'name' ); ?></a></h1>
				<?php else : ?>
					<p class="site-title"><a href="<?php echo esc_url( home_url( '/' ) ); ?>" rel="home"><?php bloginfo( 'name' ); ?></a></p>
				<?php endif;

				$description = get_bloginfo( 'description', 'display' ); ?>
				<?php if ( $description || is_customize_preview() ) : ?>
					<p class="site-description"><?php echo $description; // WPCS: xss ok. ?></p>
				<?php endif; ?>
			</div><!-- .site-branding -->

			<nav id="site-navigation" class="main-navigation" role="navigation">
				<?php wp_nav_menu( array( 'theme_location' => 'primary', 'menu_id' => 'primary-menu', 'class' => 'menu') ); ?>
			</nav><!-- #site-navigation -->
		</div><!-- .wrap -->
	</header><!-- .site-header -->

	<div id="content" class="site-content">
