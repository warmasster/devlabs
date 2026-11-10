# Router FRR con lo mínimo para que la terminal del lab sea cómoda y persistente.
FROM quay.io/frrouting/frr:10.4.1
RUN apk add --no-cache bash tmux tcpdump iproute2 iputils ncurses-terminfo vim less
COPY tmux.conf /etc/relavops/tmux.conf
ENV TERM=xterm-256color
