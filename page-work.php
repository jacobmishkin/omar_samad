<?php
/**
 * The template for displaying The Work page.
 *
 * @link https://codex.wordpress.org/Template_Hierarchy
 *
 * @package omarSamad
 */

get_header(); ?>

	<div class="wrap">
		<div class="primary content-area">
			<main id="main" class="site-main" role="main">

				<?php
				while ( have_posts() ) : the_post();

					get_template_part( 'template-parts/content', 'work' );

					// If comments are open or we have at least one comment, load up the comment template.
					if ( comments_open() || get_comments_number() ) :
						comments_template();
					endif;

				endwhile; // End of the loop.
				?>

			</main><!-- #main -->
		</div><!-- .primary -->
	</div><!-- .wrap -->

<?php get_footer(); ?>
