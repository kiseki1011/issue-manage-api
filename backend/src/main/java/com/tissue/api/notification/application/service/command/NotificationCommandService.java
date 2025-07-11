package com.tissue.api.notification.application.service.command;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.tissue.api.common.event.DomainEvent;
import com.tissue.api.common.exception.type.ResourceNotFoundException;
import com.tissue.api.notification.domain.model.Notification;
import com.tissue.api.notification.domain.model.vo.EntityReference;
import com.tissue.api.notification.domain.model.vo.NotificationMessage;
import com.tissue.api.notification.infrastructure.repository.NotificationRepository;
import com.tissue.api.workspacemember.application.service.command.WorkspaceMemberReader;
import com.tissue.api.workspacemember.domain.model.WorkspaceMember;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class NotificationCommandService {

	private final NotificationRepository notificationRepository;
	private final WorkspaceMemberReader workspaceMemberReader;

	@Transactional
	public Notification createNotification(
		DomainEvent event,
		Long receiverMemberId,
		NotificationMessage message
	) {
		WorkspaceMember actor = workspaceMemberReader.findWorkspaceMember(
			event.getActorMemberId(),
			event.getWorkspaceCode()
		);

		WorkspaceMember receiver = workspaceMemberReader.findWorkspaceMember(
			receiverMemberId,
			event.getWorkspaceCode()
		);

		EntityReference entityReference = event.createEntityReference();

		Notification notification = Notification.builder()
			.eventId(event.getEventId())
			.notificationType(event.getNotificationType())
			.entityReference(entityReference)
			.actorMemberId(event.getActorMemberId())
			.actorDisplayName(actor.getDisplayName())
			.message(message)
			.receiverMemberId(receiverMemberId)
			.receiverEmail(receiver.getEmail())
			.build();

		return notificationRepository.save(notification);
	}

	@Transactional
	public void markAsRead(Long notificationId, Long receiverMemberId) {
		Notification notification = notificationRepository.findByIdAndReceiverMemberId(
				notificationId,
				receiverMemberId
			)
			.orElseThrow(() -> new ResourceNotFoundException(
				String.format("Notification not found. notification id: %d", notificationId)));

		notification.markAsRead();
	}

	@Transactional
	public void markAllAsRead(Long memberId, String workspaceCode) {
		List<Notification> notifications = notificationRepository
			.findByReceiverMemberIdAndEntityReference_WorkspaceCodeAndIsReadFalse(memberId,
				workspaceCode);

		notifications.forEach(Notification::markAsRead);
		notificationRepository.saveAll(notifications);
	}
}
