package com.tissue.support.helper;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.security.servlet.SecurityAutoConfiguration;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.MessageSource;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.FilterType;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.servlet.HandlerInterceptor;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tissue.api.global.config.webmvc.WebMvcConfig;
import com.tissue.api.invitation.application.service.command.InvitationCommandService;
import com.tissue.api.invitation.application.service.query.InvitationQueryService;
import com.tissue.api.invitation.application.service.reader.InvitationReader;
import com.tissue.api.invitation.infrastructure.repository.InvitationRepository;
import com.tissue.api.invitation.presentation.controller.command.InvitationController;
import com.tissue.api.issue.application.service.command.IssueCommandService;
import com.tissue.api.issue.application.service.command.IssueReviewerCommandService;
import com.tissue.api.issue.infrastructure.repository.IssueRepository;
import com.tissue.api.issue.infrastructure.repository.IssueReviewerRepository;
import com.tissue.api.issue.presentation.controller.command.IssueController;
import com.tissue.api.issue.presentation.controller.command.IssueReviewerController;
import com.tissue.api.member.application.service.command.MemberCommandService;
import com.tissue.api.member.application.service.query.MemberQueryService;
import com.tissue.api.member.domain.service.MemberValidator;
import com.tissue.api.member.infrastructure.repository.MemberRepository;
import com.tissue.api.member.presentation.controller.MemberController;
import com.tissue.api.member.presentation.controller.MemberQueryController;
import com.tissue.api.position.application.service.command.PositionCommandService;
import com.tissue.api.position.application.service.command.PositionReader;
import com.tissue.api.position.application.service.query.PositionQueryService;
import com.tissue.api.position.infrastructure.repository.PositionRepository;
import com.tissue.api.position.presentation.controller.PositionController;
import com.tissue.api.review.application.service.command.ReviewCommandService;
import com.tissue.api.review.presentation.controller.ReviewController;
import com.tissue.api.security.SecurityConfig;
import com.tissue.api.security.authentication.application.service.AuthenticationService;
import com.tissue.api.security.authentication.jwt.JwtTokenService;
import com.tissue.api.security.authentication.presentation.controller.AuthenticationController;
import com.tissue.api.util.WorkspaceCodeParser;
import com.tissue.api.workspace.application.service.command.WorkspaceCommandService;
import com.tissue.api.workspace.application.service.command.WorkspaceReader;
import com.tissue.api.workspace.application.service.command.create.WorkspaceCreateRetryOnCodeCollisionService;
import com.tissue.api.workspace.application.service.query.WorkspaceQueryService;
import com.tissue.api.workspace.domain.service.WorkspaceAuthenticationService;
import com.tissue.api.workspace.domain.service.validator.WorkspaceValidator;
import com.tissue.api.workspace.infrastructure.repository.WorkspaceRepository;
import com.tissue.api.workspace.presentation.controller.command.WorkspaceController;
import com.tissue.api.workspacemember.application.service.command.WorkspaceMemberCommandService;
import com.tissue.api.workspacemember.application.service.command.WorkspaceMemberInviteService;
import com.tissue.api.workspacemember.application.service.command.WorkspaceParticipationCommandService;
import com.tissue.api.workspacemember.application.service.query.WorkspaceParticipationQueryService;
import com.tissue.api.workspacemember.infrastructure.repository.WorkspaceMemberRepository;
import com.tissue.api.workspacemember.presentation.controller.command.WorkspaceMemberDetailController;
import com.tissue.api.workspacemember.presentation.controller.command.WorkspaceMembershipController;
import com.tissue.api.workspacemember.presentation.controller.command.WorkspaceParticipationController;
import com.tissue.support.config.WebMvcTestConfig;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@WebMvcTest(
	controllers = {
		AuthenticationController.class,
		InvitationController.class,
		WorkspaceController.class,
		WorkspaceMembershipController.class,
		WorkspaceParticipationController.class,
		WorkspaceMemberDetailController.class,
		MemberController.class,
		MemberQueryController.class,
		PositionController.class,
		IssueController.class,
		ReviewController.class,
		IssueReviewerController.class
	},
	excludeAutoConfiguration = SecurityAutoConfiguration.class,
	excludeFilters = {
		@ComponentScan.Filter(type = FilterType.ASSIGNABLE_TYPE, classes = {
			WebMvcConfig.class,
			HandlerMethodArgumentResolver.class,
			HandlerInterceptor.class,
			SecurityConfig.class
		})
	}
)
@TestPropertySource(properties = {
	"jwt.secret=ThisIsADefaultTestSecretThatIs32Chars"
})
@Import(value = {WebMvcTestConfig.class})
public abstract class ControllerTestHelper {

	@Autowired
	protected MockMvc mockMvc;
	@Autowired
	protected ObjectMapper objectMapper;
	@Autowired
	protected MessageSource messageSource;

	@MockBean
	protected WorkspaceCodeParser workspaceCodeParser;

	/**
	 * Spring Security
	 */
	@MockBean
	protected JwtTokenService jwtTokenService;
	// @MockBean
	// protected JwtAuthenticationFilter jwtAuthenticationFilter;
	// @MockBean
	// protected ExceptionHandlerFilter exceptionHandlerFilter;
	// @MockBean
	// protected JwtAuthenticationEntryPoint jwtAuthenticationEntryPoint;
	// @MockBean
	// protected ApiAccessDeniedHandler apiAccessDeniedHandler;

	/**
	 * Service
	 */
	@MockBean
	protected MemberCommandService memberCommandService;
	@MockBean
	protected MemberQueryService memberQueryService;
	@MockBean
	protected WorkspaceMemberCommandService workspaceMemberCommandService;
	@MockBean
	protected WorkspaceMemberInviteService workspaceMemberInviteService;
	@MockBean
	protected WorkspaceParticipationQueryService workspaceParticipationQueryService;
	@MockBean
	protected WorkspaceParticipationCommandService workspaceParticipationCommandService;
	@MockBean
	protected WorkspaceCreateRetryOnCodeCollisionService workspaceCreateService;
	@MockBean
	protected WorkspaceReader workspaceReader;
	@MockBean
	protected WorkspaceQueryService workspaceQueryService;
	@MockBean
	protected WorkspaceCommandService workspaceCommandService;
	@MockBean
	protected AuthenticationService authenticationService;
	@MockBean
	protected InvitationCommandService invitationCommandService;
	@MockBean
	protected InvitationQueryService invitationQueryService;
	@MockBean
	protected InvitationReader invitationReader;
	@MockBean
	protected PositionCommandService positionCommandService;
	@MockBean
	protected PositionReader positionReader;
	@MockBean
	protected PositionQueryService positionQueryService;
	@MockBean
	protected IssueCommandService issueCommandService;
	@MockBean
	protected ReviewCommandService reviewCommandService;
	@MockBean
	protected IssueReviewerCommandService issueReviewerCommandService;
	@MockBean
	protected WorkspaceAuthenticationService workspaceAuthenticationService;

	/**
	 * Validator
	 */
	@MockBean
	protected MemberValidator memberValidator;
	@MockBean
	protected WorkspaceValidator workspaceValidator;

	/**
	 * Repository
	 */
	@MockBean
	protected MemberRepository memberRepository;
	@MockBean
	protected WorkspaceRepository workspaceRepository;
	@MockBean
	protected WorkspaceMemberRepository workspaceMemberRepository;
	@MockBean
	protected InvitationRepository invitationRepository;
	@MockBean
	protected PositionRepository positionRepository;
	@MockBean
	protected IssueRepository issueRepository;
	@MockBean
	protected IssueReviewerRepository issueReviewerRepository;

}
