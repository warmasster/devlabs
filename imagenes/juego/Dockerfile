# Imagen de los juegos (exámenes finales): la base + servicios reales que el juego ataca y el
# alumno defiende. Una sola imagen para los 7 juegos: las capas se comparten.
FROM relavops/base:1
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      openssh-server openssh-client sshpass iptables nftables nginx dnsmasq stress-ng lsof \
      etcd-server etcd-client cron \
 && rm -rf /var/lib/apt/lists/* \
 && mkdir -p /run/sshd /root/.ssh /etc/relavops \
 && ssh-keygen -q -t ed25519 -N '' -f /root/.ssh/id_ed25519 \
 && cp /root/.ssh/id_ed25519.pub /root/.ssh/authorized_keys \
 && chmod 600 /root/.ssh/authorized_keys \
 && printf 'PermitRootLogin prohibit-password\nUseDNS no\nPrintMotd no\nPasswordAuthentication yes\n' > /etc/ssh/sshd_config.d/juego.conf \
 && printf 'Host *\n  StrictHostKeyChecking no\n  UserKnownHostsFile /dev/null\n  LogLevel ERROR\n  ConnectTimeout 3\n' > /etc/ssh/ssh_config.d/juego.conf \
 && rm -f /etc/motd /etc/update-motd.d/* \
 && systemctl disable nginx dnsmasq etcd 2>/dev/null; true
COPY bin/ /usr/local/bin/
RUN chmod +x /usr/local/bin/*
CMD ["/usr/local/bin/arranque"]
