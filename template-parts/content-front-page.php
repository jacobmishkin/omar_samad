<?php
/**
 * Template part for displaying posts.
 *
 * @link https://codex.wordpress.org/Template_Hierarchy
 *
 * @package omarSamad
 */

?>

<article <?php post_class(); ?>>
	<header class="entry-header">
		<?php
		if ( is_single() ) :
			the_title( '<h1 class="entry-title">', '</h1>' );
		else :
			the_title( '<h2 class="screen-reader-text"><a href="' . esc_url( get_permalink() ) . '" rel="bookmark">', '</a></h2>' );
		endif;
		if ( 'post' === get_post_type() ) : ?>
		<div class="entry-meta">
			<?php _posted_on(); ?>
		</div><!-- .entry-meta -->
		<?php
		endif; ?>
	</header><!-- .entry-header -->

		<?php 
			//Reel overlay ACF fields
			$reel_overlay = get_field('reel_overlay');
			$reel_title 	= get_field('reel_title');
		?>

	<div class="entry-content">	
		<div class="reel-wrapper">
			<div class="embed-shadow-effect">
				<div class="reel-overlay" style="background-image: url('<?= $reel_overlay ?>')">
					<div class="reel-title">
						<h2><?= $reel_title ?></h2>
						<h2><?= date('Y');?></h2>
						<div class="reel-button-outer">
							<div id="reel-play" class="reel-button"></div>
						</div>
					</div>		
					<div class='embed-container'>

						<?php 
							$vimeo_url = 'https://player.vimeo.com/video/';
							$video_tag = get_field('reel');
						?>

						<iframe src="<?= $vimeo_url . $video_tag ?>?autoplay=0?enablejsapi=1" width="400" height="300" frameborder="0" webkitallowfullscreen mozallowfullscreen allowfullscreen id="vimeo-video"></iframe>
			
					</div><!-- .embed-container -->
				</div><!-- .reel overlay-->
			</div><!-- .embed-shadow-effect -->
		</div><!-- .reel wrapper-->
		<div class="front-page-menu">
			<nav class="front-page-nav" role="navigation">
					<?php wp_nav_menu( array( 'theme_location' => 'FrontPage', 'menu_id' => 'front-page-menu', 'class' => 'menu') ); ?>
				</nav>
		</div>
	</div><!-- .entry-content -->
</article><!-- #post-## -->
