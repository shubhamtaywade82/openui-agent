# frozen_string_literal: true

Rails.application.routes.draw do
  root "openui#index"

  post  "/api/chat",   to: "openui#create"
  match "/api/chat",   to: "openui#create", via: :options
  post  "/api/openui", to: "openui#create"
  match "/api/openui", to: "openui#create", via: :options

  get "/api/openui/:id/status", to: "openui#status"
  get "/api/openui/:id/stream", to: "openui#stream_status"

  get    "/api/chats",     to: "openui#list_chats"
  get    "/api/chats/:id", to: "openui#show_chat"
  delete "/api/chats/:id", to: "openui#destroy_chat"

  get "up" => "rails/health#show", as: :rails_health_check
end
