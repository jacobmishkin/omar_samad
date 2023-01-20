<?php
/**
 * The template for displaying archive pages.
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
			if ( have_posts() ) : ?>

				<header class="page-header">
					<h1 class="page-title"><?php single_cat_title(); ?></h1>
				</header><!-- .page-header -->
		
				
				<article id="<?php the_title() ?>" <?php post_class(); ?>>
						<header class="entry-header">
							<?php the_title( '<h1 class="screen-reader-text">', '</h1>' ); ?>
						</header><!-- .entry-header -->

					<div class="entry-content">
				    <ul class="os-home-page-container"> 
						    <?php
										/* Start the Loop */
										while ( have_posts() ) : the_post();

											/*
											 * Include the Post-Format-specific template for the content.
											 * If you want to override this in a child theme, then include a file
											 * called content-___.php (where ___ is the Post Format name) and that will be used instead.
											 */
											get_template_part( 'template-parts/content', 'category' );

										endwhile;

										the_posts_navigation();

									else :

										get_template_part( 'template-parts/content', 'none' );

									endif; ?>
							</ul>
				
<?php
			wp_link_pages( array(
				'before' => '<div class="page-links">' . esc_html__( 'Pages:', 'omarsamad' ),
				'after'  => '</div>',
			) );
		?>
	</div><!-- .entry-content -->

	<?php if ( get_edit_post_link() ) : ?>
		<footer class="entry-footer">
		
			<div class="front-page-menu">
					<nav class="front-page-nav" role="navigation">
					<?php wp_nav_menu( array( 'theme_location' => 'FrontPage', 'menu_id' => 'front-page-menu', 'class' => 'menu') ); ?>
					</nav>
			</div>
			<?php
				edit_post_link(
					sprintf(
						/* translators: %s: Name of current post */
						esc_html__( 'Edit %s', 'omarsamad' ),
						the_title( '<span class="screen-reader-text">"', '"</span>', false )
					),
					'<span class="edit-link">',
					'</span>'
				);
			?>
		</footer><!-- .entry-footer -->
					<?php endif; ?>
				</article><!-- #post-## -->
			</main><!-- #main -->
		</div><!-- .primary -->
	</div><!-- .wrap -->
<?php get_footer(); ?>
