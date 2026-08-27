package relay_test

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"net/url"
	"testing"

	"github.com/2233admin/agx/internal/relay"
)

func TestHandlerAuthAndModelsProxy(t *testing.T) {
	upstream := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		if request.Header.Get("Authorization") != "" {
			t.Fatalf("client authorization leaked upstream")
		}
		fmt.Fprint(writer, `{"object":"list","data":[]}`)
	}))
	defer upstream.Close()

	target, _ := url.Parse(upstream.URL)
	handler, err := relay.NewHandler(relay.Config{UpstreamURL: target.String(), ClientToken: "relay-token"})
	if err != nil {
		t.Fatal(err)
	}

	unauthorized := httptest.NewRecorder()
	handler.ServeHTTP(unauthorized, httptest.NewRequest(http.MethodGet, "/v1/models", nil))
	if unauthorized.Code != http.StatusUnauthorized {
		t.Fatalf("unauthorized status = %d", unauthorized.Code)
	}

	authorized := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/v1/models", nil)
	request.Header.Set("Authorization", "Bearer relay-token")
	handler.ServeHTTP(authorized, request)
	if authorized.Code != http.StatusOK {
		t.Fatalf("authorized status = %d", authorized.Code)
	}
}

func TestHandlerHealthIsPublicAndUnknownPathIsNot(t *testing.T) {
	target, _ := url.Parse("http://127.0.0.1:1")
	handler, err := relay.NewHandler(relay.Config{UpstreamURL: target.String(), ClientToken: "relay-token"})
	if err != nil {
		t.Fatal(err)
	}

	health := httptest.NewRecorder()
	handler.ServeHTTP(health, httptest.NewRequest(http.MethodGet, "/health", nil))
	if health.Code != http.StatusOK {
		t.Fatalf("health status = %d", health.Code)
	}

	unknown := httptest.NewRecorder()
	handler.ServeHTTP(unknown, httptest.NewRequest(http.MethodGet, "/admin", nil))
	if unknown.Code != http.StatusNotFound {
		t.Fatalf("unknown path status = %d", unknown.Code)
	}
}

func TestNewHandlerRejectsEmbeddedUpstreamCredentials(t *testing.T) {
	if _, err := relay.NewHandler(relay.Config{UpstreamURL: "http://user:password@example.test"}); err == nil {
		t.Fatal("expected embedded credentials to be rejected")
	}
}
