# import json
# import datetime
# from channels.generic.websocket import AsyncWebsocketConsumer
# from django.utils.timezone import localtime, make_aware,is_naive
# from channels.db import database_sync_to_async
# from db_model.models import User, Project, Message 

# class ChatConsumer(AsyncWebsocketConsumer):
#     async def connect(self):
#         self.project_id = self.scope["url_route"]["kwargs"]["project_id"]
#         self.room_group_name = f"chat_{self.project_id}"

#         print(f"✅ WebSocket 연결 요청됨: 프로젝트 {self.project_id}")  

#         try:
#             await self.channel_layer.group_add(self.room_group_name, self.channel_name)
#             await self.accept()
#             print(f"✅ WebSocket 연결 성공: 프로젝트 {self.project_id}")  
#         except Exception as e:
#             print(f"❌ WebSocket 연결 실패: {str(e)}")  
#             await self.close()

#     async def disconnect(self, close_code):
#         print(f"❌ WebSocket 연결 종료: 프로젝트 {self.project_id}, 코드 {close_code}")  
#         await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

#     async def receive(self, text_data):
#         data = json.loads(text_data)
#         print(f"📡 수신된 데이터: {data}")  

#         try:
#             user_id = int(data["user_id"])
#             message_content = data["message"]

#             # ✅ 데이터베이스에서 사용자 및 프로젝트 조회
#             user = await self.get_user(user_id)
#             project = await self.get_project(self.project_id)

#             # ✅ 존재하지 않는 프로젝트일 경우 WebSocket 연결 종료
#             if project is None:
#                 print(f"❌ 존재하지 않는 프로젝트 ID: {self.project_id}")
#                 await self.send(text_data=json.dumps({"error": "Project does not exist"}))
#                 await self.close()
#                 return

#             # ✅ 메시지를 데이터베이스에 저장
#             chat_message = await self.save_message(user, project, message_content)

            

#         except ValueError:
#             print(f"❌ user_id 변환 실패: {data['user_id']}")  
#             await self.send(text_data=json.dumps({"error": "Invalid user_id"}))  
#             await self.close()
#             return
#         except User.DoesNotExist:
#             print(f"❌ 존재하지 않는 사용자 ID: {data['user_id']}")  
#             await self.send(text_data=json.dumps({"error": "User does not exist"}))  
#             await self.close()
#             return
#         except Exception as e:
#             print(f"❌ WebSocket 메시지 처리 중 오류 발생: {str(e)}")  
#             await self.close()
#             return

#         # ✅ 모든 클라이언트에게 메시지 전송 (WebSocket 브로드캐스트)
#         created_time = chat_message.created_date

#         # ✅ naive datetime인 경우 timezone-aware로 변환
#         if is_naive(created_time):
#             created_time = make_aware(created_time)


#         await self.channel_layer.group_send(
#             self.room_group_name,
#             {
#                 "type": "chat_message",
#                 "message": chat_message.content,
#                 "user_id": chat_message.user.user_id,
#                 "username": chat_message.user.name,
#                 "timestamp": localtime(created_time).strftime('%#m/%#d %H:%M')
# ,
#             },
#         )



#     async def chat_message(self, event):
#         """ 클라이언트에게 메시지 전송 """
#         await self.send(text_data=json.dumps(event))

#     # ✅ 사용자 조회 (비동기 DB 호출)
#     @database_sync_to_async
#     def get_user(self, user_id):
#         return User.objects.get(user_id=user_id)

#     # ✅ 프로젝트 조회 (비동기 DB 호출)
#     @database_sync_to_async
#     def get_project(self, project_id):
#         return Project.objects.filter(project_id=project_id).first()  # ✅ 기존 `Project` 테이블에서 조회




#     # ✅ 메시지 저장 (비동기 DB 호출)
#     @database_sync_to_async
#     def save_message(self, user, project, message):
#         return Message.objects.create(user=user, project=project, content=message)


import json
from channels.generic.websocket import AsyncWebsocketConsumer
from django.utils.timezone import localtime, make_aware, is_naive
from channels.db import database_sync_to_async
from db_model.models import User, Project, Message


class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        # ──────────────────────────────────────────────
        # URL 패턴에 따라 프로젝트 채팅 vs DM 채팅 구분
        kwargs = self.scope["url_route"]["kwargs"]
        if "project_id" in kwargs:          # /chat/ws/chat/<project_id>/
            self.room_type = "project"
            self.room_id = kwargs["project_id"]
            self.room_group_name = f"chat_{self.room_id}"
        else:                               # /chat/ws/chat/dm/<room_id>/
            self.room_type = "dm"
            self.room_id = kwargs["room_id"]
            self.room_group_name = f"dm_{self.room_id}"
        # ──────────────────────────────────────────────

        print(f"✅ WebSocket 연결 요청: {self.room_type} {self.room_id}")

        try:
            await self.channel_layer.group_add(self.room_group_name, self.channel_name)
            await self.accept()
            print(f"✅ WebSocket 연결 성공: {self.room_type} {self.room_id}")
        except Exception as e:
            print(f"❌ WebSocket 연결 실패: {str(e)}")
            await self.close()

    async def disconnect(self, close_code):
        print(f"❌ WebSocket 종료: {self.room_type} {self.room_id}, 코드 {close_code}")
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def receive(self, text_data):
        data = json.loads(text_data)
        print(f"📡 수신: {data}")

        try:
            user_id = int(data["user_id"])
            message_content = data["message"]
            user = await self.get_user(user_id)

            # ── 프로젝트 채팅 ───────────────────────────
            if self.room_type == "project":
                project = await self.get_project(self.room_id)
                if project is None:
                    await self.send(text_data=json.dumps({"error": "Project does not exist"}))
                    await self.close()
                    return
                chat_obj = await self.save_message(user, project, message_content)
                created_time = chat_obj.created_date

            # ── 1:1 DM 채팅 ────────────────────────────
            else:
                dm_room = await self.get_dm_room(self.room_id)
                if dm_room is None:
                    await self.send(text_data=json.dumps({"error": "DM room does not exist"}))
                    await self.close()
                    return
                chat_obj = await self.save_dm_message(user, dm_room, message_content)
                created_time = chat_obj.created_date

        except ValueError:
            await self.send(text_data=json.dumps({"error": "Invalid user_id"}))
            await self.close()
            return
        except User.DoesNotExist:
            await self.send(text_data=json.dumps({"error": "User does not exist"}))
            await self.close()
            return
        except Exception as e:
            print(f"❌ 메시지 처리 오류: {str(e)}")
            await self.close()
            return

        # ── 타임스탬프 보정 및 브로드캐스트 ────────────
        if is_naive(created_time):
            created_time = make_aware(created_time)

        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "chat_message",
                "message": chat_obj.content,
                "user_id": chat_obj.user.user_id,
                "username": chat_obj.user.name,
                "timestamp": localtime(created_time).strftime('%#m/%#d %H:%M'),
            },
        )

    async def chat_message(self, event):
        """클라이언트로 메시지 전송"""
        await self.send(text_data=json.dumps(event))

    # ── DB 헬퍼 메서드들 ────────────────────────────────
    @database_sync_to_async
    def get_user(self, user_id):
        return User.objects.get(user_id=user_id)

    @database_sync_to_async
    def get_project(self, project_id):
        return Project.objects.filter(project_id=project_id).first()

    @database_sync_to_async
    def save_message(self, user, project, content):
        return Message.objects.create(user=user, project=project, content=content)

    @database_sync_to_async
    def get_dm_room(self, room_id):
        from db_model.models import DirectMessageRoom
        return DirectMessageRoom.objects.filter(room_id=room_id).first()

    @database_sync_to_async
    def save_dm_message(self, user, room, content):
        from db_model.models import DirectMessage
        return DirectMessage.objects.create(user=user, room=room, content=content)
