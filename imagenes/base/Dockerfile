# Imagen base de los labs "contenedor simple" y de los hosts de las topologías.
# Una sola imagen para todo el temario básico: las capas se comparten entre alumnos.
FROM debian:trixie-slim

# Las imágenes slim quitan las páginas man; las queremos (man es parte del nivel 0).
RUN rm -f /etc/dpkg/dpkg.cfg.d/docker /etc/dpkg/dpkg.cfg.d/excludes \
 && apt-get update \
 && apt-get install -y --no-install-recommends \
      bash bash-completion tmux vim nano htop less man-db manpages \
      python3 iproute2 iputils-ping tcpdump traceroute procps psmisc curl ca-certificates \
      git jq tree file ncurses-term locales netcat-openbsd dnsutils \
 # Los paquetes que ya venían en la imagen se instalaron sin man: se reinstalan.
 && dpkg-query -W -f '${binary:Package}\n' | xargs apt-get install -y --reinstall --no-install-recommends >/dev/null \
 && sed -i 's/^# *es_ES.UTF-8/es_ES.UTF-8/' /etc/locale.gen && locale-gen \
 && mandb -q \
 && rm -rf /var/lib/apt/lists/*

ENV LANG=es_ES.UTF-8 LC_ALL=es_ES.UTF-8 TERM=xterm-256color EDITOR=vim

COPY tmux.conf /etc/relavops/tmux.conf
COPY bashrc /etc/relavops.bashrc
RUN echo '. /etc/relavops.bashrc' >> /etc/bash.bashrc \
 && useradd -m -s /bin/bash alumno

# El PID 1: no muere aunque el alumno haga pkill sleep (ver el fichero maquina).
COPY maquina /usr/local/bin/maquina
RUN chmod 755 /usr/local/bin/maquina
LABEL relavops.init=maquina

WORKDIR /root
CMD ["/usr/local/bin/maquina"]
