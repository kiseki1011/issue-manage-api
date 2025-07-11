package com.tissue.api.workspacemember.presentation.controller.command;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.tissue.api.common.dto.ApiResponse;
import com.tissue.api.security.authentication.MemberUserDetails;
import com.tissue.api.security.authentication.resolver.CurrentMember;
import com.tissue.api.security.authorization.interceptor.RoleRequired;
import com.tissue.api.workspacemember.application.service.command.WorkspaceMemberCommandService;
import com.tissue.api.workspacemember.application.service.command.WorkspaceMemberInviteService;
import com.tissue.api.workspacemember.domain.model.enums.WorkspaceRole;
import com.tissue.api.workspacemember.presentation.dto.request.InviteMembersRequest;
import com.tissue.api.workspacemember.presentation.dto.request.UpdateRoleRequest;
import com.tissue.api.workspacemember.presentation.dto.response.InviteMembersResponse;
import com.tissue.api.workspacemember.presentation.dto.response.TransferOwnershipResponse;
import com.tissue.api.workspacemember.presentation.dto.response.WorkspaceMemberResponse;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@RequiredArgsConstructor
@RestController
@RequestMapping("/api/v1/workspaces/{workspaceCode}/members")
public class WorkspaceMembershipController {

	private final WorkspaceMemberCommandService workspaceMemberCommandService;
	private final WorkspaceMemberInviteService workspaceMemberInviteService;

	/**
	 * Todo
	 *  - getWorkspaceMembers: 특정 워크스페이스에서 존재하는 모든 멤버 목록 조회
	 *    - 페이징 적용
	 *    - 조건에 따른 검색 적용 필요(QueryDSL 사용할까?)
	 */
	@RoleRequired(role = WorkspaceRole.MEMBER)
	@PostMapping("/invite")
	public ApiResponse<InviteMembersResponse> inviteMembers(
		@PathVariable String workspaceCode,
		@RequestBody @Valid InviteMembersRequest request
	) {
		InviteMembersResponse response = workspaceMemberInviteService.inviteMembers(
			workspaceCode,
			request
		);

		return ApiResponse.ok("Members invited", response);
	}

	@RoleRequired(role = WorkspaceRole.ADMIN)
	@PatchMapping("/{memberId}/role")
	public ApiResponse<WorkspaceMemberResponse> updateWorkspaceMemberRole(
		@PathVariable String workspaceCode,
		@PathVariable Long memberId,
		@CurrentMember MemberUserDetails userDetails,
		@RequestBody @Valid UpdateRoleRequest request
	) {
		WorkspaceMemberResponse response = workspaceMemberCommandService.updateRole(
			workspaceCode,
			memberId,
			userDetails.getMemberId(),
			request
		);

		return ApiResponse.ok("Member's role for this workspace was updated", response);
	}

	@RoleRequired(role = WorkspaceRole.OWNER)
	@PatchMapping("/{memberId}/ownership")
	public ApiResponse<TransferOwnershipResponse> transferWorkspaceOwnership(
		@PathVariable String workspaceCode,
		@PathVariable Long memberId,
		@CurrentMember MemberUserDetails userDetails
	) {
		TransferOwnershipResponse response = workspaceMemberCommandService.transferWorkspaceOwnership(
			workspaceCode,
			memberId,
			userDetails.getMemberId()
		);

		return ApiResponse.ok("The ownership was successfully transfered", response);
	}

	@RoleRequired(role = WorkspaceRole.ADMIN)
	@ResponseStatus(HttpStatus.NO_CONTENT)
	@DeleteMapping("/{memberId}")
	public ApiResponse<Void> removeWorkspaceMember(
		@PathVariable String workspaceCode,
		@PathVariable Long memberId,
		@CurrentMember MemberUserDetails userDetails
	) {
		workspaceMemberCommandService.removeWorkspaceMember(
			workspaceCode,
			memberId,
			userDetails.getMemberId()
		);

		return ApiResponse.okWithNoContent("Member was removed from this workspace");
	}
}
