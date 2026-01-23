<?php
/**
 * PHP file to use when rendering the block type on the server to show on the front end.
 *
 * @package DeveloperShowcase\DevInspector
 */

namespace DeveloperShowcase\DevInspector;

$context = array_merge(
	array(
		'slides'       => array(),
		'currentSlide' => 0,
		'totalSlides'  => 0,
	)
);

?>
<div
	<?php echo wp_kses_data( get_block_wrapper_attributes() ); ?>
	<?php echo wp_kses_data( wp_interactivity_data_wp_context( $context ) ); ?>>
	<button
		class="toggle"
		type="button"
		data-wp-bind--aria-pressed="context."
	>
	</button>
</div>
