package com.tomas.redditclone.users;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;

import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Stream;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class RegistrationApiTests {

    private static final String PASSWORD = "learn-spring-together";

    @Autowired
    MockMvc mockMvc;

    @Autowired
    JdbcTemplate jdbcTemplate;

    @Autowired
    PasswordEncoder passwordEncoder;

    @Autowired
    ObjectMapper objectMapper;

    @Test
    void registersUserAndStoresOnlyAVerifiableHash() throws Exception {
        String username = uniqueUsername();
        mockMvc.perform(post("/api/auth/register").contentType("application/json")
                        .content(request(username, PASSWORD)))
                .andExpect(status().isCreated())
                .andExpect(content().contentTypeCompatibleWith("application/json"))
                .andExpect(jsonPath("$.id").isNumber())
                .andExpect(jsonPath("$.username").value(username))
                .andExpect(jsonPath("$.createdAt").isString())
                .andExpect(jsonPath("$.password").doesNotExist())
                .andExpect(jsonPath("$.passwordHash").doesNotExist())
                .andExpect(jsonPath("$.password_hash").doesNotExist())
                .andExpect(content().string(not(containsString(PASSWORD))))
                .andExpect(content().string(not(containsString("$argon2"))));

        String storedHash = hashFor(username);
        assertNotEquals(PASSWORD, storedHash);
        assertTrue(passwordEncoder.matches(PASSWORD, storedHash));
        assertFalse(passwordEncoder.matches("a-different-password", storedHash));
    }

    @Test
    void usesDifferentSaltsForIdenticalPasswords() throws Exception {
        String first = uniqueUsername();
        String second = uniqueUsername();
        register(first, PASSWORD);
        register(second, PASSWORD);

        assertNotEquals(hashFor(first), hashFor(second));
        assertTrue(passwordEncoder.matches(PASSWORD, hashFor(first)));
        assertTrue(passwordEncoder.matches(PASSWORD, hashFor(second)));
    }

    @ParameterizedTest
    @ValueSource(booleans = {false, true})
    void rejectsDuplicateUsernameWithoutChangingOriginalCredentials(boolean differentCase) throws Exception {
        String username = uniqueUsername();
        register(username, PASSWORD);
        String originalHash = hashFor(username);
        String duplicate = differentCase ? username.toUpperCase(Locale.ROOT) : username;

        mockMvc.perform(post("/api/auth/register").contentType("application/json")
                        .content(request(duplicate, "another-long-password")))
                .andExpect(status().isConflict())
                .andExpect(content().contentTypeCompatibleWith("application/problem+json"))
                .andExpect(jsonPath("$.detail").value("That username is already taken."))
                .andExpect(content().string(not(containsString("another-long-password"))));

        assertEquals(originalHash, hashFor(username));
        assertEquals(1, jdbcTemplate.queryForObject(
                "SELECT count(*) FROM users WHERE lower(username) = lower(?)", Integer.class, username));
    }

    @ParameterizedTest
    @MethodSource("invalidRequests")
    void rejectsInvalidInputWithoutCreatingAccount(String json) throws Exception {
        Long before = jdbcTemplate.queryForObject("SELECT count(*) FROM users", Long.class);
        mockMvc.perform(post("/api/auth/register").contentType("application/json").content(json))
                .andExpect(status().isBadRequest())
                .andExpect(content().contentTypeCompatibleWith("application/problem+json"))
                .andExpect(jsonPath("$.errors").isMap())
                .andExpect(content().string(not(containsString(PASSWORD))));
        assertEquals(before, jdbcTemplate.queryForObject("SELECT count(*) FROM users", Long.class));
    }

    static Stream<String> invalidRequests() {
        return Stream.of(
                "{}",
                "{\"username\":null,\"password\":\"" + PASSWORD + "\"}",
                "{\"username\":\"ValidUser\",\"password\":null}",
                "{\"username\":\"\",\"password\":\"" + PASSWORD + "\"}",
                "{\"username\":\"ab\",\"password\":\"" + PASSWORD + "\"}",
                "{\"username\":\"abcdefghijklmnopqrstu\",\"password\":\"" + PASSWORD + "\"}",
                "{\"username\":\"has space\",\"password\":\"" + PASSWORD + "\"}",
                "{\"username\":\"user.name\",\"password\":\"" + PASSWORD + "\"}",
                "{\"username\":\"café\",\"password\":\"" + PASSWORD + "\"}",
                "{\"username\":\"ValidUser\",\"password\":\"\"}",
                "{\"username\":\"ValidUser\",\"password\":\"short\"}",
                "{\"username\":\"ValidUser\",\"password\":\"            \"}",
                "{\"username\":\"ValidUser\",\"password\":\"" + "a".repeat(129) + "\"}"
        );
    }

    @ParameterizedTest
    @ValueSource(ints = {12, 128})
    void acceptsPasswordLengthBoundaries(int length) throws Exception {
        register(uniqueUsername(), "a".repeat(length));
    }

    @Test
    void preservesSpacesAndUnicodeInPassword() throws Exception {
        String username = uniqueUsername();
        String password = "  café with spaces  ";
        register(username, password);
        assertTrue(passwordEncoder.matches(password, hashFor(username)));
        assertFalse(passwordEncoder.matches(password.trim(), hashFor(username)));
    }

    @ParameterizedTest
    @ValueSource(strings = {"{", "null", "[]", "{\"username\":{},\"password\":\"secret\"}"})
    void rejectsMalformedJsonWithSafeError(String json) throws Exception {
        mockMvc.perform(post("/api/auth/register").contentType("application/json").content(json))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("Provide a valid registration JSON object."))
                .andExpect(content().string(not(containsString("secret"))));
    }

    @Test
    void requestToStringDoesNotExposePassword() {
        assertFalse(new RegistrationRequest("Example", PASSWORD).toString().contains(PASSWORD));
    }

    private void register(String username, String password) throws Exception {
        mockMvc.perform(post("/api/auth/register").contentType("application/json")
                        .content(request(username, password)))
                .andExpect(status().isCreated());
    }

    private String request(String username, String password) {
        return objectMapper.writeValueAsString(Map.of("username", username, "password", password));
    }

    private String hashFor(String username) {
        return jdbcTemplate.queryForObject("SELECT password_hash FROM users WHERE username = ?",
                String.class, username);
    }

    private String uniqueUsername() {
        return "User_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
    }
}
