package com.tomas.redditclone.auth;

import com.tomas.redditclone.users.AccountPrincipal;
import com.tomas.redditclone.users.UserRepository;
import jakarta.servlet.DispatcherType;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.csrf.HttpSessionCsrfTokenRepository;
import tools.jackson.databind.ObjectMapper;

import java.io.IOException;

@Configuration
public class SecurityConfiguration {

    @Bean
    public UserDetailsService userDetailsService(UserRepository users) {
        return username -> users.findForLogin(username)
                .orElseThrow(() -> new UsernameNotFoundException("Invalid username or password."));
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http, ObjectMapper objectMapper) throws Exception {
        http
                .authorizeHttpRequests(authorize -> authorize
                        .dispatcherTypeMatchers(DispatcherType.ERROR).permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/posts", "/api/posts/*",
                                "/actuator/health", "/actuator/health/**", "/api/auth/csrf").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/auth/register", "/api/auth/login").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/auth/me").authenticated()
                        .anyRequest().denyAll())
                .csrf(csrf -> csrf.csrfTokenRepository(new HttpSessionCsrfTokenRepository()))
                .requestCache(cache -> cache.disable())
                .httpBasic(basic -> basic.disable())
                .sessionManagement(session -> session
                        .sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED)
                        .sessionFixation(fixation -> fixation.changeSessionId()))
                .exceptionHandling(exceptions -> exceptions
                        .authenticationEntryPoint((request, response, exception) ->
                                writeProblem(objectMapper, response, HttpStatus.UNAUTHORIZED, "Sign in to continue."))
                        .accessDeniedHandler((request, response, exception) ->
                                writeProblem(objectMapper, response, HttpStatus.FORBIDDEN, "The request is not allowed.")))
                .formLogin(form -> form
                        .loginPage("/api/auth/login")
                        .loginProcessingUrl("/api/auth/login")
                        .successHandler((request, response, authentication) -> {
                            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                            objectMapper.writeValue(response.getWriter(),
                                    ((AccountPrincipal) authentication.getPrincipal()).profile());
                        })
                        .failureHandler((request, response, exception) ->
                                writeProblem(objectMapper, response, HttpStatus.UNAUTHORIZED,
                                        "Invalid username or password."))
                        .permitAll())
                .logout(logout -> logout
                        .logoutUrl("/api/auth/logout")
                        .invalidateHttpSession(true)
                        .clearAuthentication(true)
                        .deleteCookies("JSESSIONID")
                        .logoutSuccessHandler((request, response, authentication) ->
                                response.setStatus(HttpServletResponse.SC_NO_CONTENT))
                        .permitAll());
        return http.build();
    }

    private static void writeProblem(ObjectMapper objectMapper, HttpServletResponse response,
                                     HttpStatus status, String detail) throws IOException {
        response.setStatus(status.value());
        response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
        objectMapper.writeValue(response.getWriter(), ProblemDetail.forStatusAndDetail(status, detail));
    }
}
