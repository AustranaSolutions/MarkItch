import Capacitor

// Phase 42: the web app's own viewport meta tag (maximum-scale=1,
// user-scalable=no) is not reliably honored by WKWebView the way it is
// by desktop browsers — Luca reported still being able to pinch-zoom and
// drag the whole page around like a photo even inside the native app,
// which then fights with the duel-card's own horizontal swipe gesture and
// produces uncontrolled diagonal/circular dragging. Disabling the
// WKWebView's native pinch gesture recognizer directly is the actual fix;
// the meta tag alone isn't enough here.
class MainViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        guard let webView = bridge?.webView else { return }
        webView.scrollView.pinchGestureRecognizer?.isEnabled = false
        webView.scrollView.bounces = false
        webView.scrollView.bouncesZoom = false

        // Phase 48: Luca — "die Funktion die Apple sowieso hat, wenn man
        // eine Seite zurück möchte, swipet man vom linken Bildrand nach
        // rechts". WKWebView bringt genau das schon eingebaut mit, getrieben
        // von der echten Browser-History (die Next.js' Router beim
        // Navigieren sowieso per pushState füllt) — kein selbstgebautes
        // Gesture nötig. Kollidiert nicht mit dem Duell-Card-eigenen
        // Seiten-Swipe: das ist ein UIScreenEdgePanGestureRecognizer, der
        // nur in einem schmalen Rand von der Kante aus überhaupt anspringt,
        // ein Duell-Swipe beginnt praktisch immer weiter in der Mitte.
        webView.allowsBackForwardNavigationGestures = true
    }
}
