package com.tomas.redditclone.users;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.argon2.Argon2PasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class PasswordConfiguration {

    @Bean
    public PasswordEncoder passwordEncoder() {
        // 16-byte salt, 32-byte hash, 1 lane, 19 MiB memory, 2 iterations.
        return new Argon2PasswordEncoder(16, 32, 1, 19_456, 2);
    }
}
