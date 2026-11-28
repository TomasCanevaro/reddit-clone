package com.tomas.redditclone.auth;

import com.tomas.redditclone.users.AccountPrincipal;
import com.tomas.redditclone.users.RegistrationRequest;
import com.tomas.redditclone.users.RegistrationService;
import com.tomas.redditclone.users.UserResponse;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;

import java.util.Locale;
import java.util.UUID;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class SessionAuthTests {

    private static final String PASSWORD = "learn-spring-together";

    @Autowired
    MockMvc mockMvc;

    @Autowired
    ObjectMapper objectMapper;

    @Autowired
    RegistrationService registrationService;

    @Test
    void anonymousUserCannotReadCurrentAccount() throws Exception {
        mockMvc.perform(get("/api/auth/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(content().contentTypeCompatibleWith("application/problem+json"))
                .andExpect(jsonPath("$.detail").value("Sign in to continue."));
    }

    @Test
    void postsAndHealthRemainPublic() throws Exception {
        mockMvc.perform(get("/api/posts")).andExpect(status().isOk());
        mockMvc.perform(get("/actuator/health")).andExpect(status().isOk());
    }

    @Test
    void csrfEndpointCreatesSessionAndReturnsTokenWithoutCaching() throws Exception {
        var result = mockMvc.perform(get("/api/auth/csrf"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.headerName").value("X-CSRF-TOKEN"))
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(header().string("Cache-Control", containsString("no-store")))
                .andReturn();
        assertNotNull(result.getRequest().getSession(false));
    }

    @Test
    void logsInCaseInsensitivelyRotatesSessionAndReturnsOnlyPublicProfile() throws Exception {
        UserResponse account = createAccount();
        var csrf = csrf(null);
        String originalSessionId = csrf.session().getId();
        login(csrf, account.username().toUpperCase(Locale.ROOT), PASSWORD)
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith("application/json"))
                .andExpect(jsonPath("$.id").value(account.id()))
                .andExpect(jsonPath("$.username").value(account.username()))
                .andExpect(jsonPath("$.createdAt").isString())
                .andExpect(jsonPath("$.password").doesNotExist())
                .andExpect(jsonPath("$.passwordHash").doesNotExist())
                .andExpect(content().string(not(containsString(PASSWORD))))
                .andExpect(content().string(not(containsString("$argon2"))));

        assertNotEquals(originalSessionId, csrf.session().getId());
        var context = (SecurityContext) csrf.session().getAttribute(
                HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY);
        assertNotNull(context);
        var principal = (AccountPrincipal) context.getAuthentication().getPrincipal();
        assertNull(principal.getPassword(), "The authenticated session must not retain the password hash");

        mockMvc.perform(get("/api/auth/me").session(csrf.session()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(account.id()))
                .andExpect(jsonPath("$.username").value(account.username()))
                .andExpect(jsonPath("$.password").doesNotExist())
                .andExpect(jsonPath("$.passwordHash").doesNotExist())
                .andExpect(header().string("Cache-Control", containsString("no-store")));
    }

    @ParameterizedTest
    @ValueSource(booleans = {false, true})
    void wrongPasswordAndUnknownUsernameReturnSameGenericError(boolean unknownUsername) throws Exception {
        UserResponse account = createAccount();
        var csrf = csrf(null);
        String username = unknownUsername ? uniqueUsername() : account.username();
        login(csrf, username, "wrong-password")
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.detail").value("Invalid username or password."))
                .andExpect(content().string(not(containsString(username))))
                .andExpect(content().string(not(containsString("wrong-password"))));
        mockMvc.perform(get("/api/auth/me").session(csrf.session()))
                .andExpect(status().isUnauthorized());
    }

    @ParameterizedTest
    @ValueSource(strings = {"/api/auth/register", "/api/auth/login", "/api/auth/logout"})
    void rejectsPostWithoutCsrfToken(String path) throws Exception {
        mockMvc.perform(post(path).contentType("application/json").content("{}"))
                .andExpect(status().isForbidden())
                .andExpect(content().contentTypeCompatibleWith("application/problem+json"));
    }

    @Test
    void rejectsInvalidCsrfToken() throws Exception {
        var csrf = csrf(null);
        mockMvc.perform(post("/api/auth/login").session(csrf.session())
                        .header(csrf.headerName(), "not-the-token")
                        .param("username", "Example").param("password", PASSWORD))
                .andExpect(status().isForbidden());
    }

    @Test
    void registrationAcceptsTokenFromRealCsrfEndpoint() throws Exception {
        var csrf = csrf(null);
        String json = objectMapper.writeValueAsString(new RegistrationRequest(uniqueUsername(), PASSWORD));
        mockMvc.perform(post("/api/auth/register").session(csrf.session())
                        .header(csrf.headerName(), csrf.token())
                        .contentType("application/json").content(json))
                .andExpect(status().isCreated());
        // Account creation still does not sign the user in.
        mockMvc.perform(get("/api/auth/me").session(csrf.session()))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void rotatesCsrfAfterLoginAndInvalidatesSessionOnLogout() throws Exception {
        UserResponse account = createAccount();
        var beforeLogin = csrf(null);
        login(beforeLogin, account.username(), PASSWORD).andExpect(status().isOk());

        // Authentication clears the pre-login token.
        mockMvc.perform(post("/api/auth/logout").session(beforeLogin.session())
                        .header(beforeLogin.headerName(), beforeLogin.token()))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/auth/me").session(beforeLogin.session()))
                .andExpect(status().isOk());

        var afterLogin = csrf(beforeLogin.session());
        mockMvc.perform(post("/api/auth/logout").session(afterLogin.session())
                        .header(afterLogin.headerName(), afterLogin.token()))
                .andExpect(status().isNoContent())
                .andExpect(cookie().maxAge("JSESSIONID", 0));
        assertTrue(afterLogin.session().isInvalid());
        mockMvc.perform(get("/api/auth/me")).andExpect(status().isUnauthorized());

        // A new anonymous session can obtain a fresh token and log in again.
        var afterLogout = csrf(null);
        assertNotEquals(afterLogin.session().getId(), afterLogout.session().getId());
        login(afterLogout, account.username(), PASSWORD).andExpect(status().isOk());
    }

    @Test
    void getRequestCannotLogUserOut() throws Exception {
        UserResponse account = createAccount();
        var csrf = csrf(null);
        login(csrf, account.username(), PASSWORD).andExpect(status().isOk());
        mockMvc.perform(get("/api/auth/logout").session(csrf.session()))
                .andExpect(status().is4xxClientError());
        mockMvc.perform(get("/api/auth/me").session(csrf.session()))
                .andExpect(status().isOk());
    }

    private org.springframework.test.web.servlet.ResultActions login(CsrfSession csrf, String username,
                                                                     String password) throws Exception {
        return mockMvc.perform(post("/api/auth/login").session(csrf.session())
                .with(request -> {
                    // Model a browser sending an existing, valid session cookie.
                    request.setRequestedSessionId(csrf.session().getId());
                    request.setRequestedSessionIdValid(true);
                    request.setRequestedSessionIdFromCookie(true);
                    return request;
                })
                .header(csrf.headerName(), csrf.token())
                .contentType("application/x-www-form-urlencoded")
                .param("username", username).param("password", password));
    }

    private CsrfSession csrf(MockHttpSession session) throws Exception {
        var request = get("/api/auth/csrf");
        if (session != null) request.session(session);
        MvcResult result = mockMvc.perform(request).andExpect(status().isOk()).andReturn();
        var json = objectMapper.readTree(result.getResponse().getContentAsString());
        return new CsrfSession((MockHttpSession) result.getRequest().getSession(false),
                json.get("headerName").asString(), json.get("token").asString());
    }

    private UserResponse createAccount() {
        return registrationService.register(new RegistrationRequest(uniqueUsername(), PASSWORD));
    }

    private String uniqueUsername() {
        return "User_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
    }

    private record CsrfSession(MockHttpSession session, String headerName, String token) {
    }
}
