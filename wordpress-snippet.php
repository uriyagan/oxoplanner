<?php
/**
 * OXO POP Planner — WordPress / WooCommerce companion snippet.
 *
 * Paste this into your theme's functions.php (child theme) or a small custom
 * plugin / Code Snippets entry. It adds two things the standalone planner needs:
 *
 *   1) /wp-json/oxo/v1/prices         — live prices feed (regular + sale).
 *   2) "?oxo_cart=ID:QTY,ID:QTY"      — add many products to the cart at once,
 *                                       then redirect the visitor to the cart.
 *
 * The price feed is also what the planner's "סנכרון מחירים" button and the
 * webhook fallback read. If you already expose /wp-json/oxo/v1/prices you can
 * delete section (1).
 */

if (!defined('ABSPATH')) exit;

/* ── (1) Prices REST endpoint ─────────────────────────────────────── */
add_action('rest_api_init', function () {
    register_rest_route('oxo/v1', '/prices', array(
        'methods'             => 'GET',
        'permission_callback' => '__return_true',
        'callback'            => function () {
            if (!function_exists('wc_get_products')) return array();
            $products = wc_get_products(array('status' => 'publish', 'limit' => -1));
            $out = array();
            foreach ($products as $p) {
                $out[] = array(
                    'id'            => $p->get_id(),
                    'price'         => (float) $p->get_price(),
                    'regular_price' => (float) $p->get_regular_price(),
                    'sale_price'    => $p->get_sale_price() !== '' ? (float) $p->get_sale_price() : null,
                    'on_sale'       => $p->is_on_sale(),
                    'in_stock'      => $p->is_in_stock(),
                );
            }
            return $out;
        },
    ));
});

/* ── (2) Bulk "add to cart" then redirect to cart ─────────────────── */
add_action('template_redirect', function () {
    if (empty($_GET['oxo_cart']) || !function_exists('WC') || is_admin()) return;

    $raw = sanitize_text_field(wp_unslash($_GET['oxo_cart'])); // e.g. "6210:2,6185:1"
    $pairs = array_filter(explode(',', $raw));
    if (empty($pairs)) return;

    if (WC()->cart === null) wc_load_cart();

    foreach ($pairs as $pair) {
        $parts = explode(':', $pair);
        $product_id = isset($parts[0]) ? absint($parts[0]) : 0;
        $qty        = isset($parts[1]) ? max(1, absint($parts[1])) : 1;
        if ($product_id > 0) {
            WC()->cart->add_to_cart($product_id, $qty);
        }
    }

    wp_safe_redirect(wc_get_cart_url());
    exit;
});

/* ── (3) Optional: allow the planner's origin to read the price feed ─
 * Only needed if your planner is on a different domain and you call the
 * price feed from the browser. The server-side calls don't need this.
 */
add_action('rest_api_init', function () {
    add_filter('rest_pre_serve_request', function ($served, $result, $request) {
        if (strpos($request->get_route(), '/oxo/v1/') === 0) {
            header('Access-Control-Allow-Origin: *');
        }
        return $served;
    }, 10, 3);
});
