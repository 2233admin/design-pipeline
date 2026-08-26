package relay

import (
	"context"
	"crypto/subtle"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"strings"
	"sync/atomic"
	"time"
)

const (
	DefaultListenAddr  = "0.0.0.0:15724"
	DefaultUpstreamURL = "http://127.0.0.1:15724"
	DefaultHealthURL   = "http://127.0.0.1:15724/health"
	maxHeaderBytes     = 1 << 20
	requestIDPrefix    = "agx-relay"
)

type Config struct {
	ListenAddr    string
	UpstreamURL   string
	ClientToken   string
	UpstreamToken string
}

func ConfigFromEnv() Config {
	return Config{
		ListenAddr:    env("AGX_RELAY_LISTEN_ADDR", DefaultListenAddr),
		UpstreamURL:   env("AGX_RELAY_UPSTREAM_URL", DefaultUpstreamURL),
		ClientToken:   strings.TrimSpace(os.Getenv("AGX_RELAY_TOKEN")),
		UpstreamToken: strings.TrimSpace(os.Getenv("AGX_RELAY_UPSTREAM_TOKEN")),
	}
}

func NewHandler(config Config) (http.Handler, error) {
	target, err := parseUpstream(config.UpstreamURL)
	if err != nil {
		return nil, err
	}

	proxy := httputil.NewSingleHostReverseProxy(target)
	originalDirector := proxy.Director
	proxy.Director = func(request *http.Request) {
		originalDirector(request)
		request.Header.Del("Authorization")
		if token := strings.TrimSpace(config.UpstreamToken); token != "" {
			request.Header.Set("Authorization", "Bearer "+token)
		}
	}
	proxy.ErrorHandler = func(writer http.ResponseWriter, _ *http.Request, _ error) {
		writeError(writer, http.StatusBadGateway, "upstream_unavailable", "upstream is unavailable")
	}

	state := &handler{clientToken: strings.TrimSpace(config.ClientToken), proxy: proxy}
	mux := http.NewServeMux()
	mux.HandleFunc("/health", state.health)
	mux.HandleFunc("/v1/models", state.models)
	mux.HandleFunc("/v1/chat/completions", state.chatCompletions)
	return http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		requestID := state.nextRequestID()
		writer.Header().Set("X-Request-ID", requestID)
		writer.Header().Set("Vary", "Authorization")
		if request.URL.Path != "/health" && request.URL.Path != "/v1/models" && request.URL.Path != "/v1/chat/completions" {
			mux.ServeHTTP(writer, request)
			return
		}
		if request.URL.Path != "/health" && !state.authorized(request) {
			writeError(writer, http.StatusUnauthorized, "unauthorized", "missing or invalid bearer token")
			return
		}
		mux.ServeHTTP(writer, request)
	}), nil
}

func Run(ctx context.Context, config Config, logger *log.Logger) error {
	if logger == nil {
		logger = log.Default()
	}
	if strings.TrimSpace(config.ListenAddr) == "" {
		config.ListenAddr = DefaultListenAddr
	}
	handler, err := NewHandler(config)
	if err != nil {
		return err
	}
	server := &http.Server{
		Addr:              config.ListenAddr,
		Handler:           handler,
		ReadHeaderTimeout: 10 * time.Second,
		ReadTimeout:       30 * time.Second,
		WriteTimeout:      0,
		IdleTimeout:       2 * time.Minute,
		MaxHeaderBytes:    maxHeaderBytes,
	}
	go func() {
		<-ctx.Done()
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		_ = server.Shutdown(shutdownCtx)
	}()
	logger.Printf("AGX API Relay listening on %s", server.Addr)
	err = server.ListenAndServe()
	if errors.Is(err, http.ErrServerClosed) {
		return nil
	}
	return err
}

type handler struct {
	clientToken string
	proxy       *httputil.ReverseProxy
	requestID   atomic.Uint64
}

func (h *handler) nextRequestID() string {
	return fmt.Sprintf("%s-%d-%d", requestIDPrefix, time.Now().UnixNano(), h.requestID.Add(1))
}

func (h *handler) authorized(request *http.Request) bool {
	if h.clientToken == "" {
		return true
	}
	value := strings.TrimSpace(request.Header.Get("Authorization"))
	const prefix = "Bearer "
	if len(value) < len(prefix) || !strings.EqualFold(value[:len(prefix)], prefix) {
		return false
	}
	provided := strings.TrimSpace(value[len(prefix):])
	return subtle.ConstantTimeCompare([]byte(provided), []byte(h.clientToken)) == 1
}

func (h *handler) health(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodGet {
		methodNotAllowed(writer, http.MethodGet)
		return
	}
	writeJSON(writer, http.StatusOK, map[string]any{
		"status":        "running",
		"auth_required": h.clientToken != "",
	})
}

func (h *handler) models(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodGet {
		methodNotAllowed(writer, http.MethodGet)
		return
	}
	h.proxy.ServeHTTP(writer, request)
}

func (h *handler) chatCompletions(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodPost {
		methodNotAllowed(writer, http.MethodPost)
		return
	}
	h.proxy.ServeHTTP(writer, request)
}

func parseUpstream(raw string) (*url.URL, error) {
	target, err := url.Parse(strings.TrimSpace(raw))
	if err != nil || target.Scheme == "" || target.Host == "" || target.User != nil {
		return nil, fmt.Errorf("AGX-RELAY-UPSTREAM: URL must be an http(s) URL without embedded credentials")
	}
	if target.Scheme != "http" && target.Scheme != "https" {
		return nil, fmt.Errorf("AGX-RELAY-UPSTREAM: URL scheme must be http or https")
	}
	return target, nil
}

func env(key, fallback string) string {
	if value := strings.TrimSpace(os.Getenv(key)); value != "" {
		return value
	}
	return fallback
}

func methodNotAllowed(writer http.ResponseWriter, allowed string) {
	writer.Header().Set("Allow", allowed)
	writeError(writer, http.StatusMethodNotAllowed, "method_not_allowed", "method not allowed")
}

func writeError(writer http.ResponseWriter, status int, code, message string) {
	writeJSON(writer, status, map[string]any{
		"error": map[string]string{"code": code, "message": message},
	})
}

func writeJSON(writer http.ResponseWriter, status int, value any) {
	writer.Header().Set("Content-Type", "application/json; charset=utf-8")
	writer.WriteHeader(status)
	_ = json.NewEncoder(writer).Encode(value)
}
