.PHONY: up down install

up:
	$(MAKE) -C api up

down:
	$(MAKE) -C api down

install:
	$(MAKE) -C api install
