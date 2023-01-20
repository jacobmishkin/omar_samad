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

	<div class="entry-content">
		<div class='embed-container'>

		<?php 
			$youTube_url 							= 'https://www.youtube.com/embed/';
			$video_tag 								= get_field('video');
			$conditional_video 				= get_field('not_youtube');
			$not_youTube 							= get_field('not_youtube_video');
			$conditional_coming_soon 	= get_field( 'coming_soon' );
			$conditional_link 				= get_field( 'confirm' );
			$link 										= get_field('link');
			
			$lib_url = get_template_directory_uri() . '';
		?>
		<?php 
				// Checks for posts with different url's
			if( $conditional_video ) :

						echo $not_youTube;

				//Checks if no video is uploaded
		 elseif( $conditional_coming_soon ) : ?>
			
				<div class="coming-soon-wrap">
					<h2>coming Soon!</h2>
					<p>Please check back soon for when this video is avaible</p>
				</div>
		
<?php elseif($conditional_link) : ?>
			<p>Please click on the image below to view the film.</p>
			
			<a href="<?= $link ?>" target="_blank"><?php the_post_thumbnail(); ?></a>			

			<!-- Default YouTube Player -->
	<?php else : ?>

			<iframe src="<?= $youTube_url . $video_tag ?>?autoplay=1" width="400" height="300" frameborder="0" webkitallowfullscreen mozallowfullscreen allowfullscreen id="vimeo-video"></iframe>

	<?php endif; ?>

		</div><!-- .embed-container -->
			<?php
			the_content( sprintf(
				/* translators: %s: Name of current post. */
				wp_kses( __( 'Continue reading %s <span class="meta-nav">&rarr;</span>', 'omarsamad' ), array( 'span' => array( 'class' => array() ) ) ),
				the_title( '<span class="screen-reader-text">"', '"</span>', false )
			) );

			wp_link_pages( array(
				'before' => '<div class="page-links">' . esc_html__( 'Pages:', 'omarsamad' ),
				'after'  => '</div>',
			) );
		?>
	</div><!-- .entry-content -->
</article><!-- #post-## -->
