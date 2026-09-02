package org.example.link.auth.config;

import lombok.RequiredArgsConstructor;
import org.example.link.auth.jwt.JwtFilter;
import org.example.link.auth.oauth.CustomOAuth2UserService;
import org.example.link.auth.oauth.OAuth2SuccessHandler;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.factory.PasswordEncoderFactories;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {
    private final JwtFilter jwtFilter;
    private final CustomOAuth2UserService customOAuth2UserService;
    private final OAuth2SuccessHandler oAuth2SuccessHandler;
    private final AuthProperties authProperties;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .cors(Customizer.withDefaults())
                // JWT 방식이면 세션 사용 안 함
                .sessionManagement(session ->
                        session.sessionCreationPolicy(
                                SessionCreationPolicy.STATELESS
                        )
                )
                .csrf(csrf -> csrf
                        .csrfTokenRepository(csrfTokenRepository())
                        .csrfTokenRequestHandler(new CsrfTokenRequestAttributeHandler())
                        // SockJS는 WebSocket fallback 전송에 내부 POST 요청을 사용한다.
                        .ignoringRequestMatchers("/ws/**")
                )
                .oauth2Login(oauth -> oauth
                        .userInfoEndpoint(userInfo ->
                                userInfo.userService(customOAuth2UserService)
                        )
                        .successHandler(oAuth2SuccessHandler)
                )
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(
                                "/",
                                "/categories",
                                "/users/signup",
                                "/users/public/**",
                                "/auth/login",
                                "/auth/csrf",
                                "/auth/refresh",
                                "/health",
                                "/oauth2/**",
                                "/login/oauth2/**",
                                "/swagger-ui/**",
                                "/swagger-ui.html",
                                "/v3/api-docs/**",
                                "/ws/**",
                                "/chat-test.html",
                                "/test/**"
                        ).permitAll()
                                .requestMatchers(HttpMethod.GET, "/talents").permitAll()
                                .requestMatchers(HttpMethod.GET, "/talents/*").permitAll()
                                .requestMatchers(HttpMethod.GET, "/talents/*/files").permitAll()
                                .requestMatchers(HttpMethod.GET, "/talents/search").permitAll()
                                .requestMatchers(HttpMethod.GET, "/requests").permitAll()
                                .requestMatchers(HttpMethod.GET, "/requests/*").permitAll()
                                .requestMatchers(HttpMethod.GET, "/requests/*/files").permitAll()
                                .requestMatchers(HttpMethod.GET, "/requests/search").permitAll()
                                .requestMatchers(HttpMethod.POST, "/requests").authenticated()
                                .requestMatchers(HttpMethod.POST, "/talents").authenticated()
                                .requestMatchers(HttpMethod.PUT, "/requests/**").authenticated()
                                .requestMatchers(HttpMethod.PUT, "/talents/**").authenticated()
                                .requestMatchers(HttpMethod.DELETE, "/requests/**").authenticated()
                                .requestMatchers(HttpMethod.DELETE, "/talents/**").authenticated()
                                .requestMatchers(HttpMethod.POST, "/ai/matches/analyze").permitAll()
                                .requestMatchers(HttpMethod.POST, "/ai/matches").permitAll()
                                .anyRequest().authenticated()
                        )
                        .exceptionHandling(exception -> exception
                                .authenticationEntryPoint((request, response, authException) ->
                                        response.sendError(
                                                jakarta.servlet.http.HttpServletResponse.SC_UNAUTHORIZED
                                        )
                                )
                        )
                        // JWT Filter 등록
                        .addFilterBefore(
                                jwtFilter,
                                UsernamePasswordAuthenticationFilter.class
                        );
        return http.build();
    }

    @Bean
    public CookieCsrfTokenRepository csrfTokenRepository() {
        CookieCsrfTokenRepository repository =
                CookieCsrfTokenRepository.withHttpOnlyFalse();

        repository.setCookieCustomizer(cookie -> cookie
                .path("/")
                .secure(authProperties.cookie().secure())
                .sameSite(authProperties.cookie().sameSite())
        );

        return repository;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return PasswordEncoderFactories.createDelegatingPasswordEncoder();
    }
}
