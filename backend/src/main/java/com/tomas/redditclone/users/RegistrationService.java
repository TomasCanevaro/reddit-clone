package com.tomas.redditclone.users;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class RegistrationService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public RegistrationService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public UserResponse register(RegistrationRequest request) {
        String passwordHash = passwordEncoder.encode(request.password());
        return userRepository.create(request.username(), passwordHash)
                .orElseThrow(UsernameTakenException::new);
    }
}
