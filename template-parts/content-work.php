<?php
/**
 * Template part for the in page.php.
 *
 * @link https://codex.wordpress.org/Template_Hierarchy
 *
 * @package BW_Custom_Theme
 */
?>

<article id="<?php the_title() ?>" <?php post_class(); ?>>
	<header class="entry-header">
		<?php the_title( '<h1 class="screen-reader-text">', '</h1>' ); ?>
	</header><!-- .entry-header -->

	<div class="entry-content">

		<?php 
		$args = array(
			'post_type' => 'film_portfolio',
			'posts_per_page' => -1
			);
		$query = new WP_Query( $args );

		if($query->have_posts()  ): ?>
    
    <ul class="os-home-page-container">

  				<?php while($query->have_posts() ): $query->the_post(); ?>
         
            <li class="films">
            	<a class="os-film-link" href=" <?php the_permalink(); ?>"> 
								<div class="os-film-thumbnail"> 
									<?php the_post_thumbnail(); ?>
										<svg  class="rect rect-overlay" width="732px" height="395px" viewBox="103 156 732 395">
						    			<rect x="103" y="156" width="732" height="395"></rect>
						    		</svg>
								</div>
								
						    <div class="os-fig-caption">
										<h2><?php the_title(); ?> </h2>
				    		</div>	
						 </a>
        		</li>
    <?php endwhile; ?>
    </ul>
    <?php wp_reset_postdata(); // IMPORTANT - reset the $post object so the rest of the page works correctly ?>
<?php endif;


			wp_link_pages( array(
				'before' => '<div class="page-links">' . esc_html__( 'Pages:', 'omarsamad' ),
				'after'  => '</div>',
			) );
		?>
	</div><!-- .entry-content -->

	<?php if ( get_edit_post_link() ) : ?>
		<footer class="entry-footer">
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
